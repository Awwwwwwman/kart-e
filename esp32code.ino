/*
 * ESP32 Grid Navigator Robot - PID ENCODER + BLE Edition
 * Hardware: ESP32-WROOM, Cytron MDD20A, 2x DC Motors w/ Encoders, HC-SR04
 * Communication: Bluetooth Low Energy (BLE) Server
 */
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <math.h>

// =========================================================
// 1. BLE CONFIGURATION
// =========================================================
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

BLEServer* pServer = NULL;
BLECharacteristic* pCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;

bool newCommandReceived = false;
int targetX = 0;
int targetY = 0;
bool emergencyStop = false;

// Calibration Test Variables
bool manualMoveReceived = false;
int manualMoveCells = 0;
bool manualTurnReceived = false;
int manualTurnAngle = 0;

// =========================================================
// 2. HARDWARE PIN DEFINITIONS
// =========================================================

// Cytron MDD20A Left Motor
const int PWM_L = 25; 
const int DIR_L = 26; 

// Cytron MDD20A Right Motor
const int PWM_R = 27; 
const int DIR_R = 33; 

// --- NEW: ENCODER PINS ---
const int ENC_L_A = 13;
const int ENC_L_B = 14;
const int ENC_R_A = 34; // Note: Pin 34 is input-only
const int ENC_R_B = 12; // CHANGED: Updated to Pin 12 as requested

volatile long leftTicks = 0;
volatile long rightTicks = 0;

const int TRIG_PIN = 32;
const int ECHO_PIN = 35;

const int freq       = 5000; // 5kHz is ideal for DC Motors
const int pwmChannelL = 0;
const int pwmChannelR = 1;
const int resolution  = 8;

// =========================================================
// 3. ENCODER & PID CALIBRATION SETTINGS
// =========================================================

// NOTE: adjusted to 4x14 grid per user request
const int   GRID_COLS       = 4;
const int   GRID_ROWS       = 14;
const float GRID_SIZE_METERS = 1.0;

// *** TUNE THESE NUMBERS USING THE WEB APP ***
long TICKS_PER_METER    = 4830; // Restored to 4830 (1 Meter calculation)

// CHANGED: Perfecting the left/right turns with pure math!
long TICKS_PER_90DEG_L  = 798; // CHANGED: Lowered to fix 30-degree overturn over 10 spins
long TICKS_PER_90DEG_R  = 821; // CHANGED: Lowered to fix 20-degree overturn over 10 spins

// PID Tuning: P-Controller (The "Rubber Band")
float Kp = 7.0; 

// Base Motor Power (Mechanical Trimming)
// CHANGED: The Goldilocks Zone! 
int BASE_SPEED_L = 202; // Dead center between drifting left (200) and right (204)
int BASE_SPEED_R = 236; // Dead center between drifting left (232) and right (240)

// CHANGED: We must apply this same 34-point power gap to turning!
int TURN_SPEED_L = 162; 
int TURN_SPEED_R = 196; 

const int OBSTACLE_LIMIT = 5;

// =========================================================
// 4. 4x14 GRID MAP
// =========================================================

const uint8_t GRID_MAP[GRID_ROWS][GRID_COLS] = {
  /* Y=0  */ {0,0,0,0},
  /* Y=1  */ {0,0,0,0},
  /* Y=2  */ {0,1,1,0},
  /* Y=3  */ {0,1,1,0},
  /* Y=4  */ {0,0,0,0},
  /* Y=5  */ {0,0,0,0},
  /* Y=6  */ {0,1,1,0},
  /* Y=7  */ {0,1,1,0},
  /* Y=8  */ {0,0,0,0},
  /* Y=9  */ {0,0,0,0},
  /*Y=10  */ {0,1,1,0},
  /*Y=11  */ {0,1,1,0},
  /*Y=12  */ {0,0,0,0},
  /*Y=13  */ {0,0,0,0},
};

// =========================================================
// 5. BFS PATHFINDING STRUCTURES
// =========================================================

struct Cell { int x, y; };
#define MAX_PATH 400
#define MAX_QUEUE 400

Cell bfsPath[MAX_PATH];
int  bfsPathLen = 0;

Cell  bfsParent[GRID_ROWS][GRID_COLS];
bool  bfsVisited[GRID_ROWS][GRID_COLS];

const int DIR_DX[4] = { 1,  0, -1,  0 };
const int DIR_DY[4] = { 0,  1,  0, -1 };
const int DIR_HEADING[4] = { 0, 90, 180, 270 };

// Function Prototypes
void executePathBFS();
void turnToCardinal(int targetDeg);
bool driveOneCell();
long getDistance();
void stopMotors();

bool runBFS(int sx, int sy, int tx, int ty) {
  for (int r = 0; r < GRID_ROWS; r++)
    for (int c = 0; c < GRID_COLS; c++) {
      bfsVisited[r][c] = false;
      bfsParent[r][c]  = {-1, -1};
    }

  Cell queue[MAX_QUEUE];
  int  qHead = 0, qTail = 0;

  queue[qTail++] = {sx, sy};
  bfsVisited[sy][sx] = true;
  bool found = false;

  while (qHead < qTail) {
    Cell cur = queue[qHead++];
    if (cur.x == tx && cur.y == ty) {
      found = true;
      break;
    }
    for (int d = 0; d < 4; d++) {
      int nx = cur.x + DIR_DX[d];
      int ny = cur.y + DIR_DY[d];

      if (nx < 0 || nx >= GRID_COLS || ny < 0 || ny >= GRID_ROWS) continue;
      if (GRID_MAP[ny][nx] == 1) continue;
      if (bfsVisited[ny][nx]) continue;

      bfsVisited[ny][nx] = true;
      bfsParent[ny][nx]  = cur;
      queue[qTail++]     = {nx, ny};

      if (qTail >= MAX_QUEUE) return false;
    }
  }

  if (!found) return false;

  Cell temp[MAX_PATH];
  int  tempLen = 0;
  Cell cur = {tx, ty};
  while (!(cur.x == sx && cur.y == sy)) {
    temp[tempLen++] = cur;
    cur = bfsParent[cur.y][cur.x];
    if (tempLen >= MAX_PATH) break;
  }
  temp[tempLen++] = {sx, sy}; 

  bfsPathLen = 0;
  for (int i = tempLen - 1; i >= 0; i--)
    bfsPath[bfsPathLen++] = temp[i];

  return true;
}

// =========================================================
// 6. HARDWARE INTERRUPTS (ENCODERS)
// =========================================================
// These run in the background 10,000x a second to catch every wheel click!

void IRAM_ATTR leftEncoderISR() {
  if (digitalRead(ENC_L_B) == HIGH) leftTicks = leftTicks + 1;
  else leftTicks = leftTicks - 1;
}

void IRAM_ATTR rightEncoderISR() {
  if (digitalRead(ENC_R_B) == HIGH) rightTicks = rightTicks + 1;
  else rightTicks = rightTicks - 1;
}

// =========================================================
// 7. ROBOT STATE & BLE CALLBACKS
// =========================================================

int   currentX       = 0;
int   currentY       = 0;
int   currentHeading = 90;

class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
      Serial.println("Device connected via BLE!");
    };
    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
      Serial.println("Device disconnected.");
    }
};

class MyCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
      String rxValue = pCharacteristic->getValue();
      if (rxValue.length() > 0) {
        String cmd = rxValue;
        cmd.trim();
        Serial.print("Received Value: ");
        Serial.println(cmd);

        if (cmd == "stop") {
          emergencyStop = true;
          stopMotors();
          Serial.println("EMERGENCY STOP TRIGGERED VIA BLE");
        } else if (cmd.startsWith("M,")) {
          // Manual Calibration: Move
          manualMoveCells = cmd.substring(2).toInt();
          manualMoveReceived = true;
          emergencyStop = false;
        } else if (cmd.startsWith("T,")) {
          // Manual Calibration: Turn
          manualTurnAngle = cmd.substring(2).toInt();
          manualTurnReceived = true;
          emergencyStop = false;
        } else {
          int commaIndex = cmd.indexOf(',');
          if (commaIndex > 0) {
            targetX = cmd.substring(0, commaIndex).toInt();
            targetY = cmd.substring(commaIndex + 1).toInt();
            emergencyStop = false;
            newCommandReceived = true; 
          }
        }
      }
    }
};

void setup() {
  Serial.begin(115200);

  // Motor Direction Pins
  pinMode(DIR_L, OUTPUT); 
  pinMode(DIR_R, OUTPUT);
  pinMode(TRIG_PIN, OUTPUT); 
  pinMode(ECHO_PIN, INPUT);

  // --- NEW: ENCODER SETUP ---
  pinMode(ENC_L_A, INPUT_PULLUP);
  pinMode(ENC_L_B, INPUT_PULLUP);
  pinMode(ENC_R_A, INPUT); // Pin 34 is input-only (No internal pullup)
  pinMode(ENC_R_B, INPUT_PULLUP);

  attachInterrupt(digitalPinToInterrupt(ENC_L_A), leftEncoderISR, RISING);
  attachInterrupt(digitalPinToInterrupt(ENC_R_A), rightEncoderISR, RISING);

  // PWM Setup
  ledcAttach(PWM_L, freq, resolution);
  ledcAttach(PWM_R, freq, resolution);

  // Initialize BLE
  BLEDevice::init("SupermarketRobot"); 
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());
  BLEService *pService = pServer->createService(SERVICE_UUID);
  pCharacteristic = pService->createCharacteristic(
                      CHARACTERISTIC_UUID,
                      BLECharacteristic::PROPERTY_READ   |
                      BLECharacteristic::PROPERTY_WRITE  |
                      BLECharacteristic::PROPERTY_NOTIFY |
                      BLECharacteristic::PROPERTY_INDICATE
                    );
  pCharacteristic->setCallbacks(new MyCallbacks());
  pCharacteristic->addDescriptor(new BLE2902());
  pService->start();
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(false);
  pAdvertising->setMinPreferred(0x0); 
  BLEDevice::startAdvertising();
  
  Serial.println("BLE Advertising Started.");
}

void loop() {
  if (!deviceConnected && oldDeviceConnected) {
      delay(500); 
      pServer->startAdvertising(); 
      oldDeviceConnected = deviceConnected;
  }
  if (deviceConnected && !oldDeviceConnected) {
      oldDeviceConnected = deviceConnected;
  }

  // --- Handle Manual Calibration Commands ---
  if (manualMoveReceived) {
    manualMoveReceived = false;
    Serial.printf("[CALIBRATION] Moving %d cells forward\n", manualMoveCells);
    for(int i=0; i<manualMoveCells; i++) {
       if(emergencyStop) break;
       driveOneCell();
    }
  }

  if (manualTurnReceived) {
    manualTurnReceived = false;
    Serial.printf("[CALIBRATION] Turning %d degrees\n", manualTurnAngle);
    turnToCardinal(currentHeading + manualTurnAngle);
  }

  // --- Handle Map Navigation ---
  if (newCommandReceived) {
    newCommandReceived = false;

    if (targetX < 0 || targetX >= GRID_COLS || targetY < 0 || targetY >= GRID_ROWS) {
      Serial.println("ERROR: Coordinate out of bounds (X:0-3, Y:0-13).");
      return;
    }
    if (GRID_MAP[targetY][targetX] == 1) {
      Serial.println("ERROR: Target cell is an obstacle!");
      return;
    }

    Serial.printf("Planning path from (%d,%d) to (%d,%d)...\n", currentX, currentY, targetX, targetY);

    if (!runBFS(currentX, currentY, targetX, targetY)) {
      Serial.println("ERROR: No valid path found (blocked by obstacles).");
      return;
    }

    Serial.printf("Path found! %d steps.\n", bfsPathLen - 1);
    executePathBFS();
  }
}

// =========================================================
// 8. PID PATH EXECUTION (ENCODER BASED)
// =========================================================

void executePathBFS() {
  for (int i = 1; i < bfsPathLen; i++) {
    if (emergencyStop) {
      Serial.println("Path execution aborted via Bluetooth STOP.");
      return;
    }

    int nextX = bfsPath[i].x;
    int nextY = bfsPath[i].y;

    int dx = nextX - currentX;
    int dy = nextY - currentY;
    int requiredHeading = -1;

    if      (dx ==  1 && dy ==  0) requiredHeading = 0;
    else if (dx == -1 && dy ==  0) requiredHeading = 180;
    else if (dx ==  0 && dy ==  1) requiredHeading = 90;
    else if (dx ==  0 && dy == -1) requiredHeading = 270;

    turnToCardinal(requiredHeading);
    delay(300);

    bool success = driveOneCell();

    if (!success) {
      Serial.printf("Execution halted at step %d!\n", i);
      return;
    }

    currentX = nextX;
    currentY = nextY;

    Serial.printf("[POS] Robot at (%d, %d) | Step %d/%d\n", currentX, currentY, i, bfsPathLen - 1);

    if (deviceConnected) {
      String posMsg = "POS:" + String(currentX) + "," + String(currentY) + "," + String(currentHeading);
      pCharacteristic->setValue(posMsg.c_str());
      pCharacteristic->notify();
    }
  }
  Serial.printf("[POS] Destination reached: (%d,%d)\n", currentX, currentY);
}

void turnToCardinal(int targetDeg) {
  targetDeg = ((targetDeg % 360) + 360) % 360;
  int diff = targetDeg - currentHeading;

  while (diff <= -180) diff += 360;
  while (diff >   180) diff -= 360;

  if (abs(diff) < 5) return;
  int turns = diff / 90;

  if (turns > 0) {
    for (int t = 0; t < turns; t++) {
      if(emergencyStop) return;
      leftTicks = 0; rightTicks = 0; // Reset encoders
      
      digitalWrite(DIR_L, LOW);  digitalWrite(DIR_R, HIGH); // Spin Left
      ledcWrite(PWM_L, TURN_SPEED_L); ledcWrite(PWM_R, TURN_SPEED_R);
      
      int debugTimer = 0;
      // FIX: Use || (OR) and stop each wheel individually when it hits the target!
      while(abs(leftTicks) < TICKS_PER_90DEG_L || abs(rightTicks) < TICKS_PER_90DEG_L) { 
        if(emergencyStop) break; 
        if(abs(leftTicks) >= TICKS_PER_90DEG_L) ledcWrite(PWM_L, 0);  // Brake Left
        if(abs(rightTicks) >= TICKS_PER_90DEG_L) ledcWrite(PWM_R, 0); // Brake Right
        
        if(debugTimer % 20 == 0) {
            Serial.printf("[DEBUG TURN LEFT] L_Ticks: %ld | R_Ticks: %ld\n", leftTicks, rightTicks);
        }
        debugTimer++;
        
        delay(5); 
      }
      stopMotors(); delay(300);
    }
  } else {
    int absTurns = abs(turns);
    for (int t = 0; t < absTurns; t++) {
      if(emergencyStop) return;
      leftTicks = 0; rightTicks = 0; // Reset encoders
      
      digitalWrite(DIR_L, HIGH); digitalWrite(DIR_R, LOW);  // Spin Right
      ledcWrite(PWM_L, TURN_SPEED_L); ledcWrite(PWM_R, TURN_SPEED_R);
      
      int debugTimer = 0;
      // FIX: Use || (OR) and stop each wheel individually!
      while(abs(leftTicks) < TICKS_PER_90DEG_R || abs(rightTicks) < TICKS_PER_90DEG_R) { 
        if(emergencyStop) break; 
        if(abs(leftTicks) >= TICKS_PER_90DEG_R) ledcWrite(PWM_L, 0);  // Brake Left
        if(abs(rightTicks) >= TICKS_PER_90DEG_R) ledcWrite(PWM_R, 0); // Brake Right
        
        if(debugTimer % 20 == 0) {
            Serial.printf("[DEBUG TURN RIGHT] L_Ticks: %ld | R_Ticks: %ld\n", leftTicks, rightTicks);
        }
        debugTimer++;
        
        delay(5); 
      }
      stopMotors(); delay(300);
    }
  }
  
  currentHeading = targetDeg;
  if (deviceConnected) {
      String posMsg = "POS:" + String(currentX) + "," + String(currentY) + "," + String(currentHeading);
      pCharacteristic->setValue(posMsg.c_str());
      pCharacteristic->notify();
  }
}

bool driveOneCell() {
  Serial.printf("[DRIVE] Driving one cell (%ld ticks)...\n", TICKS_PER_METER);

  // PRE-CHECK: Only wait if obstacle is actually present
  if (getDistance() < OBSTACLE_LIMIT) {
    Serial.println("[DRIVE] Obstacle detected before moving, waiting for clearance...");
    unsigned long clearSince = 0;
    bool wasClear = false;
    while (true) {
      if (emergencyStop) return false;
      if (getDistance() >= OBSTACLE_LIMIT) {
        if (!wasClear) {
          clearSince = millis();
          wasClear = true;
          Serial.println("[DRIVE] Path clear, starting 2s confirmation timer...");
        } else if (millis() - clearSince >= 2000) {
          Serial.println("[DRIVE] Path confirmed clear for 2s, proceeding.");
          break;
        }
      } else {
        if (wasClear) Serial.println("[DRIVE] Obstacle reappeared, resetting timer.");
        wasClear = false;
        stopMotors();
      }
      delay(100);
    }
  }

  // Reset encoders
  leftTicks = 0;
  rightTicks = 0;

  digitalWrite(DIR_L, HIGH); 
  digitalWrite(DIR_R, HIGH); 
  Serial.println("[DEBUG] Motors engaged FORWARD. Entering PID Loop...");

  int debugTimer = 0;

  while (abs(leftTicks) < TICKS_PER_METER && abs(rightTicks) < TICKS_PER_METER) {
    if (emergencyStop) { stopMotors(); return false; }

    long error = abs(leftTicks) - abs(rightTicks);
    int adjustment = error * Kp;
    int speedL = BASE_SPEED_L - adjustment;
    int speedR = BASE_SPEED_R + adjustment;
    if (speedL > 255) speedL = 255; if (speedL < 0) speedL = 0;
    if (speedR > 255) speedR = 255; if (speedR < 0) speedR = 0;

    if (debugTimer % 20 == 0) {
        Serial.printf("[DEBUG DRIVE] PWM_L: %d | PWM_R: %d | Ticks_L: %ld | Ticks_R: %ld\n", speedL, speedR, leftTicks, rightTicks);
    }
    debugTimer++;

    ledcWrite(PWM_L, speedL);
    ledcWrite(PWM_R, speedR);

    // MID-DRIVE OBSTACLE: Must be clear for s before resuming
    if (getDistance() < OBSTACLE_LIMIT) {
      stopMotors();
      Serial.println("[DRIVE] Mid-cell obstacle! Waiting for clearance...");
      unsigned long waitStart = millis();
      unsigned long clearSince = 0;
      bool wasClear = false;
      while (true) {
        if (emergencyStop) return false;
        if (getDistance() >= OBSTACLE_LIMIT) {
          if (!wasClear) {
            clearSince = millis();
            wasClear = true;
            Serial.println("[DRIVE] Path clear, starting 2s confirmation timer...");
          } else if (millis() - clearSince >= 2000) {
            Serial.println("[DRIVE] Path confirmed clear for 2s, resuming.");
            break;
          }
        } else {
          if (wasClear) Serial.println("[DRIVE] Obstacle reappeared, resetting timer.");
          wasClear = false;
        }
        delay(100);
      }
      // Encoders are still valid - resume without resetting ticks
      digitalWrite(DIR_L, HIGH); digitalWrite(DIR_R, HIGH);
    }

    delay(10);  
  }

  stopMotors();
  Serial.printf("[DRIVE] Final Ticks -> Left: %ld, Right: %ld\n", leftTicks, rightTicks);
  return true;
}

long getDistance() {
  digitalWrite(TRIG_PIN, LOW); delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long dur = pulseIn(ECHO_PIN, HIGH, 25000);
  if (dur == 0 || dur < 60) return 999; 
  return (long)(dur * 0.034 / 2);  
}

void stopMotors() {
  ledcWrite(PWM_L, 0);
  ledcWrite(PWM_R, 0);
}

#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <WiFi.h>
#include <PubSubClient.h>

// ================= KONFIGURASI WIFI & MQTT =================
const char* ssid = "NAMA_WIFI_KAMU";        // GANTI DENGAN NAMA WIFI ANDA
const char* password = "PASSWORD_WIFI_KAMU"; // GANTI DENGAN PASSWORD WIFI ANDA
const char* mqtt_server = "broker.emqx.io";

WiFiClient espClient;
PubSubClient client(espClient);
// ===========================================================

#define MQ2pin    34
#define DHTPIN    4
#define DHTTYPE   DHT22

#define pinKipas  18
#define pinPompa  19
#define pinBuzzer 23
#define pinFlame  26

#define pinLedR   13
#define pinLedY   12
#define pinLedG   14

DHT dht(DHTPIN, DHTTYPE);
LiquidCrystal_I2C lcd(0x27, 16, 2);

float lastTemp = 25.0;

float safeReadTemperature() {
  float t = dht.readTemperature();
  if (isnan(t)) return lastTemp;
  lastTemp = t;
  return t;
}

// Status sistem
String getStatus(bool kebakaran, bool panas, bool asapRingan) {
  if (kebakaran) return "BAHAYA ";
  if (panas || asapRingan) return "WASPADA";
  return "NORMAL ";
}

// Fungsi untuk menghubungkan WiFi
void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Menghubungkan ke WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi terhubung!");
}

// Fungsi untuk menghubungkan/re-connect ke MQTT Broker
void reconnect() {
  while (!client.connected()) {
    Serial.print("Menghubungkan ke MQTT...");
    String clientId = "ESP32_SmartHall_";
    clientId += String(random(0xffff), HEX); // Agar ID unik
    
    if (client.connect(clientId.c_str())) {
      Serial.println(" Terhubung!");
    } else {
      Serial.print(" Gagal, rc=");
      Serial.print(client.state());
      Serial.println(" Coba lagi dalam 5 detik");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(9600);

  // Inisialisasi WiFi & MQTT
  setup_wifi();
  client.setServer(mqtt_server, 1883);

  dht.begin();
  analogSetAttenuation(ADC_11db);
  analogSetWidth(12);
  analogSetPinAttenuation(MQ2pin, ADC_11db);

  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();

  pinMode(pinKipas,  OUTPUT);
  pinMode(pinPompa,  OUTPUT);
  pinMode(pinBuzzer, OUTPUT);
  pinMode(pinFlame,  INPUT);
  pinMode(pinLedR,   OUTPUT);
  pinMode(pinLedY,   OUTPUT);
  pinMode(pinLedG,   OUTPUT);

  // Semua relay OFF saat boot (active low)
  digitalWrite(pinKipas,  HIGH);
  digitalWrite(pinPompa,  HIGH);
  digitalWrite(pinBuzzer, LOW);

  // LED awal hijau
  digitalWrite(pinLedR, LOW);
  digitalWrite(pinLedY, LOW);
  digitalWrite(pinLedG, HIGH);

  lcd.clear();
  lcd.setCursor(0, 0); lcd.print("  Sistem Siap!");
  delay(2000);
  lcd.clear();
}

void loop() {
  // Pastikan selalu terhubung ke MQTT
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  float suhu = safeReadTemperature();

  // MQ-2 rata-rata 5 sampel
  long sum = 0;
  for (int i = 0; i < 5; i++) { sum += analogRead(MQ2pin); delay(10); }
  int mq = sum / 5;

  bool flameDetected = (digitalRead(pinFlame) == LOW);
  bool kebakaran     = (mq > 2000 && suhu > 36) || flameDetected;
  bool panas         = (suhu > 30 && !kebakaran);
  bool asapRingan    = (mq >= 1200 && mq <= 2000 && !kebakaran);

  // ── PENGIRIMAN DATA MQTT (Kirim tiap 3 detik agar tidak spam) ──
  static unsigned long lastMqttSend = 0;
  if (millis() - lastMqttSend > 3000) {
    lastMqttSend = millis();
    
    // Publish suhu ke topik web
    client.publish("smarthall/sensor/suhu", String(suhu, 1).c_str());
    // Publish asap ke topik web
    client.publish("smarthall/sensor/asap", String(mq).c_str());
  }

  // ── Relay & Buzzer ──────────────────────────────────────
  if (kebakaran) {
    digitalWrite(pinBuzzer, HIGH);
    digitalWrite(pinKipas,  HIGH);  // kipas OFF
    digitalWrite(pinPompa,  LOW);   // pompa ON
  } else if (panas) {
    digitalWrite(pinBuzzer, LOW);
    digitalWrite(pinKipas,  LOW);   // kipas ON
    digitalWrite(pinPompa,  HIGH);  // pompa OFF
  } else if (asapRingan) {
    digitalWrite(pinBuzzer, HIGH);
    digitalWrite(pinKipas,  HIGH);  // kipas OFF
    digitalWrite(pinPompa,  HIGH);  // pompa OFF
  } else {
    digitalWrite(pinBuzzer, LOW);
    digitalWrite(pinKipas,  HIGH);  // kipas OFF
    digitalWrite(pinPompa,  HIGH);  // pompa OFF
  }

  // ── LED RGB ─────────────────────────────────────────────
  if (kebakaran) {
    digitalWrite(pinLedG, LOW);
    digitalWrite(pinLedY, LOW);
    digitalWrite(pinLedR, HIGH);
  } else if (panas || asapRingan) {
    digitalWrite(pinLedR, LOW);
    digitalWrite(pinLedG, LOW);
    digitalWrite(pinLedY, HIGH);
  } else {
    digitalWrite(pinLedR, LOW);
    digitalWrite(pinLedY, LOW);
    digitalWrite(pinLedG, HIGH);
  }

  // ── Serial Monitor ───────────────────────────────────────
  Serial.printf("Suhu: %.1f | Asap: %d | Flame: %s | Status: %s | Kipas: %s | Pompa: %s\n",
    suhu, mq,
    flameDetected ? "ADA" : "TIDAK",
    getStatus(kebakaran, panas, asapRingan).c_str(),
    kebakaran ? "OFF" : (panas ? "ON" : "OFF"),
    kebakaran ? "ON"  : "OFF"
  );

  // ── LCD ─────────────────────────────────────────────────
  static unsigned long lastSwitch = 0;
  static int page = 0;
  static bool kelipState = false;
  static unsigned long lastKelip = 0;

  if (flameDetected) {
    if (millis() - lastKelip > 500) {
      lastKelip = millis();
      kelipState = !kelipState;
      lcd.clear();
      if (kelipState) {
        lcd.setCursor(0, 0); lcd.print("API TERDETEKSI!");
        lcd.setCursor(0, 1); lcd.print("Status: BAHAYA");
      }
    }
  } else {
    if (millis() - lastSwitch > 3000) {
      lastSwitch = millis();
      page = (page + 1) % 3;
      lcd.clear();

      if (page == 0) {
        lcd.setCursor(0, 0);
        lcd.print("Suhu : "); lcd.print(suhu, 1); lcd.print((char)223); lcd.print("C");
        lcd.setCursor(0, 1);
        lcd.print("Asap : "); lcd.print(mq);
      } else if (page == 1) {
        lcd.setCursor(0, 0); lcd.print("Api  :");
        lcd.setCursor(0, 1); lcd.print("Tidak Terdeteksi");
      } else {
        String status = getStatus(kebakaran, panas, asapRingan);
        lcd.setCursor(0, 0);
        lcd.print("Status: "); lcd.print(status);
        lcd.setCursor(0, 1);
        lcd.print("Pompa : "); lcd.print(kebakaran ? "ON " : "OFF");
      }
    }
  }

  delay(450);
}
#include <WiFi.h>
#include <WebServer.h>
#include <FS.h>
#include <LittleFS.h>

const char* ssid = "CHANDRA AUTO first floor";
const char* password = "CHANDRA@777777";

IPAddress staticIP(192, 168, 2, 69); // Your desired static IP
IPAddress gateway(192, 168, 2, 1);   // Your router's IP address (gateway)
IPAddress subnet(255, 255, 255, 0);

WebServer server(80);

const int RED_PIN = LED_BUILTIN;
const int GREEN_PIN = 12;
const int BLUE_PIN = 13;

const int freq = 5000;
const int resolution = 8;
const int redChannel = 0;
const int greenChannel = 1;
const int blueChannel = 2;


// Function to get the MIME type based on file extension
String getContentType(String filename) {
  if (server.hasArg("download")) return "application/octet-stream";
  else if (filename.endsWith(".htm")) return "text/html";
  else if (filename.endsWith(".html")) return "text/html";
  else if (filename.endsWith(".css")) return "text/css";
  else if (filename.endsWith(".js")) return "application/javascript";
  else if (filename.endsWith(".png")) return "image/png";
  else if (filename.endsWith(".gif")) return "image/gif";
  else if (filename.endsWith(".jpg")) return "image/jpeg";
  else if (filename.endsWith(".ico")) return "image/x-icon";
  else if (filename.endsWith(".svg")) return "image/svg+xml";
  else if (filename.endsWith(".xml")) return "text/xml";
  else if (filename.endsWith(".pdf")) return "application/pdf";
  else if (filename.endsWith(".zip")) return "application/zip";
  else if (filename.endsWith(".gz")) return "application/x-gzip";
  return "text/plain";
}

// Function to handle requests for files from the filesystem
bool handleFile(String path) {
  Serial.print("handleFile: ");
  Serial.println(path);
  if (path.endsWith("/")) path = path + "login.html"; // Default to login.html for root path

  String contentType = getContentType(path);


  if (LittleFS.exists(path)) { 

    File file;
    
    file = LittleFS.open(path, "r"); 
    

    if (!file) { // Added check in case open fails for some reason
      Serial.printf("❌ Failed to open file: %s\n", path.c_str());
      return false;
    }

    server.streamFile(file, contentType);
    file.close();
    Serial.printf("✅ Served file: %s (Type: %s)\n", path.c_str(), contentType.c_str());
    return true;
  }
  Serial.printf("❌ File not found: %s\n", path.c_str());
  return false;
}

void handleSetColor() {
  Serial.println("\n--- New Request ---");
  Serial.println("🔵 Received POST request on /setcolor");

  if (server.hasArg("plain") == false) {
    Serial.println("❌ No body found");
    server.send(400, "text/plain", "Body not received");
    return;
  }

  String body = server.arg("plain");
  Serial.print("📦 Raw Body: '");
  Serial.print(body);
  Serial.println("'");

  if (server.hasHeader("Content-Type")) {
    String contentType = server.header("Content-Type");
    Serial.print("📋 Content-Type: ");
    Serial.println(contentType);
  } else {
    Serial.println("⚠️ Warning: No Content-Type header found.");
  }

  int rIndex = body.indexOf("\"r\":");
  int gIndex = body.indexOf("\"g\":");
  int bIndex = body.indexOf("\"b\":");

  Serial.printf("🔍 Indices: r=%d, g=%d, b=%d\n", rIndex, gIndex, bIndex);

  if (rIndex == -1 || gIndex == -1 || bIndex == -1) {
    Serial.println("❌ Missing r, g, or b values in parsed JSON structure.");
    server.send(400, "text/plain", "Missing color values");
    return;
  }

  int rComma = body.indexOf(",", rIndex);
  if (rComma == -1) rComma = body.indexOf("}", rIndex);
  int gComma = body.indexOf(",", gIndex);
  if (gComma == -1) gComma = body.indexOf("}", gIndex);
  int bEnd = body.indexOf("}", bIndex);

  String rVal = body.substring(rIndex + 4, rComma);
  String gVal = body.substring(gIndex + 4, gComma);
  String bVal = body.substring(bIndex + 4, bEnd);

  Serial.print("✂️ Extracted R val string: '"); Serial.print(rVal); Serial.println("'");
  Serial.print("✂️ Extracted G val string: '"); Serial.print(gVal); Serial.println("'");
  Serial.print("✂️ Extracted B val string: '"); Serial.print(bVal); Serial.println("'");

  int red = rVal.toInt();
  int green = gVal.toInt();
  int blue = bVal.toInt();

  Serial.printf("🔴 Red: %d | 🟢 Green: %d | 🔵 Blue: %d\n", red, green, blue);

  if (red < 0 || red > 255 || green < 0 || green > 255 || blue < 0 || blue > 255) {
    Serial.println("⚠️ Warning: Color values out of 0-255 range. Clamping.");
    red = constrain(red, 0, 255);
    green = constrain(green, 0, 255);
    blue = constrain(blue, 0, 255);
    Serial.printf("Clamped values: R:%d, G:%d, B:%d\n", red, green, blue);
  }

  ledcWrite(redChannel, red);
  ledcWrite(greenChannel, green);
  ledcWrite(blueChannel, blue);

  Serial.println("✅ Colors applied.");
  server.send(200, "text/plain", "OK");
}


void setup() {
  Serial.begin(115200);

  if (!WiFi.config(staticIP, gateway, subnet)) {
    Serial.println("STA Failed to configure");
  }

  ledcSetup(redChannel, freq, resolution);
  ledcSetup(greenChannel, freq, resolution);
  ledcSetup(blueChannel, freq, resolution);

  ledcAttachPin(RED_PIN, redChannel);
  ledcAttachPin(GREEN_PIN, greenChannel);
  ledcAttachPin(BLUE_PIN, blueChannel);

  ledcWrite(redChannel, 0);
  ledcWrite(greenChannel, 0);
  ledcWrite(blueChannel, 0);

  Serial.println("🔌 Connecting to Wi-Fi...");
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\n✅ Connected to Wi-Fi!");
  IPAddress ip = WiFi.localIP();
  Serial.print("🌐 ESP32 IP address: ");
  Serial.println(ip);
  Serial.print("Access webpage at http://");
  Serial.println(ip);



  // --- Initialize LittleFS ---
  if (!LittleFS.begin(true)) {  // Start LittleFS, with format option set to true
    Serial.println("❌ An Error has occurred while mounting LittleFS");
    Serial.println("Formatting LittleFS..."); // Add this
    if(!LittleFS.format()){
       Serial.println("❌ Formatting LittleFS failed");
       return;
    }
    Serial.println("✅ LittleFS formatted successfully!");
    if(!LittleFS.begin()){
       Serial.println("❌ Failed to mount LittleFS after format");
       return;
    }
    Serial.println("✅ LittleFS mounted successfully!");
  }
  Serial.println("✅ LittleFS mounted successfully!");

  // --- Register Handlers ---
  server.on("/setcolor", HTTP_POST, handleSetColor);

  server.onNotFound([]() {
    if (!handleFile(server.uri())) {
      server.send(404, "text/plain", "404: Not Found");
    }
  });

  server.begin();
  Serial.println("✅ HTTP server started");
}

void loop() {
  server.handleClient();
}

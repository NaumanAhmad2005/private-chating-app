export async function generateKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );
  
  const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
  
  return {
    privateKey: keyPair.privateKey,
    publicKey: keyPair.publicKey,
    publicKeyJwk
  };
}

export async function getGlobalSharedSecret() {
  const rawKey = new TextEncoder().encode("GlobalSecret123!"); // 16 bytes = 128 bit
  return await window.crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function deriveSharedSecret(privateKey, publicKeyJwk) {
  // Import the other user's public key
  const publicKey = await window.crypto.subtle.importKey(
    "jwk",
    publicKeyJwk,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );

  // Derive AES-GCM shared secret
  return await window.crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: publicKey
    },
    privateKey,
    {
      name: "AES-GCM",
      length: 128
    },
    false, // Don't allow exporting the shared secret
    ["encrypt", "decrypt"]
  );
}

// Convert ArrayBuffer to Base64
function bufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Convert Base64 to ArrayBuffer
function base64ToBuffer(base64) {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function encryptText(text, sharedKey) {
  if (!text) return text;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  
  // Generate a random initialization vector
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    sharedKey,
    data
  );
  
  // Combine IV and Ciphertext, then convert to Base64
  const payload = new Uint8Array(iv.length + ciphertext.byteLength);
  payload.set(iv, 0);
  payload.set(new Uint8Array(ciphertext), iv.length);
  
  return bufferToBase64(payload.buffer);
}

export async function decryptText(encryptedBase64, sharedKey) {
  if (!encryptedBase64) return encryptedBase64;
  
  try {
    const payloadBuffer = base64ToBuffer(encryptedBase64);
    const payload = new Uint8Array(payloadBuffer);
    
    // Extract IV (first 12 bytes) and ciphertext
    const iv = payload.slice(0, 12);
    const ciphertext = payload.slice(12);
    
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      sharedKey,
      ciphertext
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err) {
    console.error("Decryption failed:", err);
    return "[Encrypted Message]";
  }
}

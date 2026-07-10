import os
import base64
import logging
import httpx
from typing import Optional
from cryptography.fernet import Fernet

logger = logging.getLogger("dpdpa.vault")

class VaultClient:
    def __init__(self):
        self.vault_url = os.environ.get("VAULT_ADDR", "http://localhost:8200")
        self.token = os.environ.get("VAULT_TOKEN", "dpdpa-root-token")
        self.key_name = "dpdpa-encryption-key"
        self.is_offline = True
        
        # Setup local fallback key
        fallback_key = os.environ.get("DPDPA_FALLBACK_KEY")
        if not fallback_key:
            fallback_key = Fernet.generate_key().decode()
            os.environ["DPDPA_FALLBACK_KEY"] = fallback_key
        self.local_cipher = Fernet(fallback_key.encode())

        # Attempt to ping and initialize Vault
        self._initialize_vault()

    def _initialize_vault(self):
        try:
            # Check connection
            headers = {"X-Vault-Token": self.token}
            response = httpx.get(f"{self.vault_url}/v1/sys/health", headers=headers, timeout=2.0)
            if response.status_code in [200, 429, 472, 473]:
                self.is_offline = False
                logger.info("Connected to HashiCorp Vault.")
                
                # Check if transit engine is enabled, mount if missing
                mounts_res = httpx.get(f"{self.vault_url}/v1/sys/mounts", headers=headers, timeout=2.0)
                if mounts_res.status_code == 200:
                    mounts = mounts_res.json()
                    if "transit/" not in mounts:
                        logger.info("Mounting transit engine in Vault...")
                        httpx.post(
                            f"{self.vault_url}/v1/sys/mounts/transit",
                            headers=headers,
                            json={"type": "transit"},
                            timeout=2.0
                        )

                # Create transit key if not exists
                key_res = httpx.get(f"{self.vault_url}/v1/transit/keys/{self.key_name}", headers=headers, timeout=2.0)
                if key_res.status_code == 404:
                    logger.info(f"Creating transit key '{self.key_name}' in Vault...")
                    httpx.post(
                        f"{self.vault_url}/v1/transit/keys/{self.key_name}",
                        headers=headers,
                        json={"type": "aes256-gcm96"},
                        timeout=2.0
                    )
        except Exception as e:
            logger.warning(f"Vault server unreachable. Operating in secure offline mode: {str(e)}")

    def encrypt(self, plain_text: str) -> str:
        """
        Encrypts text using Vault Transit secrets engine.
        Falls back to local Fernet encryption if Vault is offline.
        """
        if not plain_text:
            return ""
            
        if self.is_offline:
            encrypted_bytes = self.local_cipher.encrypt(plain_text.encode())
            return f"local-fernet:{encrypted_bytes.decode()}"

        try:
            headers = {"X-Vault-Token": self.token}
            encoded_text = base64.b64encode(plain_text.encode()).decode()
            payload = {"plaintext": encoded_text}
            
            res = httpx.post(
                f"{self.vault_url}/v1/transit/encrypt/{self.key_name}",
                headers=headers,
                json=payload,
                timeout=2.0
            )
            if res.status_code == 200:
                return res.json()["data"]["ciphertext"]
            else:
                raise RuntimeError(f"Vault encryption failure: {res.text}")
        except Exception as e:
            logger.error(f"Encryption failed, falling back to local: {str(e)}")
            encrypted_bytes = self.local_cipher.encrypt(plain_text.encode())
            return f"local-fernet:{encrypted_bytes.decode()}"

    def decrypt(self, cipher_text: str) -> str:
        """
        Decrypts text using Vault Transit secrets engine.
        Falls back to local Fernet if Vault is offline or text is local-fernet.
        """
        if not cipher_text:
            return ""

        if cipher_text.startswith("local-fernet:"):
            cipher_data = cipher_text.replace("local-fernet:", "")
            return self.local_cipher.decrypt(cipher_data.encode()).decode()

        if self.is_offline:
            raise RuntimeError("Cannot decrypt Vault ciphertext in offline mode")

        try:
            headers = {"X-Vault-Token": self.token}
            payload = {"ciphertext": cipher_text}
            
            res = httpx.post(
                f"{self.vault_url}/v1/transit/decrypt/{self.key_name}",
                headers=headers,
                json=payload,
                timeout=2.0
            )
            if res.status_code == 200:
                base64_plain = res.json()["data"]["plaintext"]
                return base64.b64decode(base64_plain).decode()
            else:
                raise RuntimeError(f"Vault decryption failure: {res.text}")
        except Exception as e:
            logger.error(f"Decryption failed: {str(e)}")
            raise e

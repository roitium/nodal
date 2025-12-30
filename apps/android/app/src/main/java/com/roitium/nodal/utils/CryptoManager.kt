import android.content.Context
import com.google.crypto.tink.Aead
import com.google.crypto.tink.KeyTemplates
import com.google.crypto.tink.RegistryConfiguration
import com.google.crypto.tink.config.TinkConfig
import com.google.crypto.tink.integration.android.AndroidKeysetManager

class CryptoManager(context: Context) {
    private val aead: Aead by lazy {
        TinkConfig.register()
        val masterKeyUri = "android-keystore://master_key"

        val keysetHandle = AndroidKeysetManager.Builder()
            .withSharedPref(context, "master_keyset", "master_key_prefs")
            .withKeyTemplate(KeyTemplates.get("AES256_GCM"))
            .withMasterKeyUri(masterKeyUri)
            .build()
            .keysetHandle

        keysetHandle.getPrimitive(RegistryConfiguration.get(), Aead::class.java)
    }

    fun encrypt(plaintext: String): String {
        val bytes = aead.encrypt(plaintext.toByteArray(), null)
        return android.util.Base64.encodeToString(bytes, android.util.Base64.DEFAULT)
    }

    fun decrypt(ciphertext: String): String? {
        return try {
            val bytes = android.util.Base64.decode(ciphertext, android.util.Base64.DEFAULT)
            val decrypted = aead.decrypt(bytes, null)
            String(decrypted)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
}
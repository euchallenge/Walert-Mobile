package org.aic.policytool

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.Notification
import android.app.NotificationChannel
import android.graphics.Bitmap
import android.app.NotificationManager
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.view.WindowInsets
import android.widget.FrameLayout
import java.util.Locale
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader

/** Thin wrapper: shows web/index.html full screen. All content lives in the web folder. */
class MainActivity : Activity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Serve assets from a real https origin so the page behaves like a normal website.
        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView = WebView(this).apply {
            setBackgroundColor(0xFF0B1E33.toInt())   // navy until the page paints (no white flash)
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            // The page (https asset origin) may call the demo relay at http://localhost:8765; the network
            // security config allows plain http to localhost only.
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            // Residents side: the muted "what to do" animation starts on its own.
            settings.mediaPlaybackRequiresUserGesture = false
            // Residents side: the page finds "my municipality" from the location, on the phone only.
            @Suppress("DEPRECATION")
            settings.setGeolocationEnabled(true)
            webChromeClient = object : WebChromeClient() {
                // No grey "play" placeholder before a video's first frame (WebView's default poster)
                override fun getDefaultVideoPoster(): Bitmap = Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888)

                override fun onGeolocationPermissionsShowPrompt(origin: String, callback: GeolocationPermissions.Callback) {
                    if (Uri.parse(origin).host != ASSET_HOST) return callback.invoke(origin, false, false)
                    if (hasLocationPermission()) return callback.invoke(origin, true, false)
                    pendingGeo = origin to callback
                    requestPermissions(
                        arrayOf(Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION),
                        LOCATION_REQUEST
                    )
                }
            }
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                    assetLoader.shouldInterceptRequest(request.url)

                // Source links open in the browser, not inside the tool.
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                    if (request.url.host == ASSET_HOST) return false
                    try {
                        val url = request.url.toString()
                        if (url.startsWith("sms:") || url.startsWith("smsto:")) {
                            // "Text my location": SENDTO + sms_body, so the text survives in every SMS app;
                            // no recipient, the person picks one.
                            val body = Uri.decode(url.substringAfter("body=", ""))
                            startActivity(Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:")).putExtra("sms_body", body))
                        } else {
                            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                        }
                    } catch (e: ActivityNotFoundException) {
                        // No app can open this link (e.g. no browser on a demo device): stay in the tool.
                    }
                    return true
                }
            }
            // Keep the page clear of the status and navigation bars (edge-to-edge on Android 15+).
            setOnApplyWindowInsetsListener { v, insets ->
                @Suppress("DEPRECATION")
                v.setPadding(0, insets.systemWindowInsetTop, 0, insets.systemWindowInsetBottom)
                insets
            }
        }
        webView.addJavascriptInterface(AlertBridge(), "AndroidBridge")
        // Android 15+ draws apps edge to edge: keep the page out from under the status and gesture bars.
        // The navy frame shows behind the (white) system icons.
        val root = FrameLayout(this).apply {
            setBackgroundColor(0xFF0B1E33.toInt())
            addView(webView)
            setOnApplyWindowInsetsListener { v, insets ->
                if (Build.VERSION.SDK_INT >= 30) {
                    val b = insets.getInsets(WindowInsets.Type.systemBars())
                    v.setPadding(b.left, b.top, b.right, b.bottom)
                } else {
                    @Suppress("DEPRECATION")
                    v.setPadding(insets.systemWindowInsetLeft, insets.systemWindowInsetTop,
                        insets.systemWindowInsetRight, insets.systemWindowInsetBottom)
                }
                insets
            }
        }
        setContentView(root)

        if (savedInstanceState == null) {
            webView.loadUrl("https://$ASSET_HOST/assets/web/index.html")
        } else {
            webView.restoreState(savedInstanceState)
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    @Deprecated("Back handling for API 26+")
    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else @Suppress("DEPRECATION") super.onBackPressed()
    }

    // Demo alert waiting for the notification permission (Android 13+ asks on first use).
    private var pendingAlert: Pair<String, String>? = null
    // Location request from the page waiting for the location permission.
    private var pendingGeo: Pair<String, GeolocationPermissions.Callback>? = null

    private fun hasLocationPermission() =
        checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
            checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED

    /** Lets the residents side show its labelled demo alert as a local notification (nothing is sent anywhere). */
    private inner class AlertBridge {
        @JavascriptInterface
        fun notify(title: String, text: String) = runOnUiThread {
            if (Build.VERSION.SDK_INT >= 33 &&
                checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
            ) {
                pendingAlert = title to text
                requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), NOTIFY_REQUEST)
                return@runOnUiThread
            }
            showAlert(title, text)
        }

        /** Easy read: speak a text with the phone's own text-to-speech (works offline with the installed voice). */
        @JavascriptInterface
        fun speak(text: String) = speakIn(text, "en-GB")

        /** Same, in the language the resident chose (a tag such as "fr-BE"); English if the phone has no such voice. */
        @JavascriptInterface
        fun speakIn(text: String, tag: String) = runOnUiThread {
            val say = { engine: TextToSpeech ->
                val wanted = Locale.forLanguageTag(tag)
                val ok = engine.setLanguage(wanted) >= TextToSpeech.LANG_AVAILABLE
                if (!ok) engine.language = Locale.UK
                engine.speak(text, TextToSpeech.QUEUE_FLUSH, null, "say")
            }
            val engine = tts
            if (engine != null) {
                say(engine)
            } else {
                tts = TextToSpeech(this@MainActivity) { status ->
                    if (status == TextToSpeech.SUCCESS) tts?.let(say)
                }
            }
        }
    }

    private var tts: TextToSpeech? = null
    private var nextNotificationId = 1

    override fun onDestroy() {
        tts?.shutdown()
        super.onDestroy()
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        val granted = grantResults.any { it == PackageManager.PERMISSION_GRANTED }
        when (requestCode) {
            NOTIFY_REQUEST -> {
                val alert = pendingAlert
                pendingAlert = null
                if (alert != null && granted) showAlert(alert.first, alert.second)
            }
            LOCATION_REQUEST -> {
                val geo = pendingGeo
                pendingGeo = null
                geo?.second?.invoke(geo.first, granted, false)
            }
        }
    }

    private fun showAlert(title: String, text: String) {
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL, "Demo alerts", NotificationManager.IMPORTANCE_HIGH)
        )
        val notification = Notification.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(Notification.BigTextStyle().bigText(text))
            .setAutoCancel(true)
            .build()
        // A new id per alert, so a second message does not replace the first one on the phone.
        manager.notify(nextNotificationId++, notification)
    }

    private companion object {
        const val ASSET_HOST = WebViewAssetLoader.DEFAULT_DOMAIN
        const val CHANNEL = "demo_alerts"
        const val NOTIFY_REQUEST = 1
        const val LOCATION_REQUEST = 2
    }
}

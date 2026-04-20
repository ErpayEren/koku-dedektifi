# Koku Dedektifi — ProGuard/R8 rules

# Keep line numbers for crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Capacitor WebView bridge
-keepclassmembers class * {
    @com.getcapacitor.annotation.CapacitorPlugin *;
}
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }

# Keep JSInterface classes for WebView
-keepclassmembers class * extends com.getcapacitor.Plugin {
    public *;
}

# Kotlin coroutines
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}

# OkHttp (used by Capacitor networking)
-dontwarn okhttp3.**
-dontwarn okio.**
-keepnames class okhttp3.internal.publicsuffix.PublicSuffixDatabase

# AndroidX
-keep class androidx.core.app.CoreComponentFactory { *; }

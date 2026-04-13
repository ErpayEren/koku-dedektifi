import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

const String kAppUrl = String.fromEnvironment(
  'APP_URL',
  defaultValue: 'https://koku-dedektifi.vercel.app',
);
const Set<String> kTrustedHosts = <String>{
  'koku-dedektifi.vercel.app',
  'koku-dedektifi.com',
  'www.koku-dedektifi.com',
};

const bool kMobileBillingEnabled = bool.fromEnvironment(
  'MOBILE_BILLING_ENABLED',
  defaultValue: false,
);

const String kMobileBillingProvider = String.fromEnvironment(
  'MOBILE_BILLING_PROVIDER',
  defaultValue: 'none',
);

const String kMobilePaywallUrl = String.fromEnvironment(
  'MOBILE_PAYWALL_URL',
  defaultValue: '',
);

const String kMobileRevenuecatPublicSdkKey = String.fromEnvironment(
  'MOBILE_REVENUECAT_PUBLIC_SDK_KEY',
  defaultValue: '',
);

const String kMobileAdaptyPublicSdkKey = String.fromEnvironment(
  'MOBILE_ADAPTY_PUBLIC_SDK_KEY',
  defaultValue: '',
);

bool isHttpOrHttps(Uri uri) =>
    uri.scheme.toLowerCase() == 'http' || uri.scheme.toLowerCase() == 'https';

bool isTrustedHost(String host) => kTrustedHosts.contains(host.toLowerCase());

bool shouldOpenExternally(String rawUrl) {
  final Uri? uri = Uri.tryParse(rawUrl);
  if (uri == null) return true;
  if (!isHttpOrHttps(uri)) return true;
  if (uri.host.isEmpty) return false;
  return !isTrustedHost(uri.host);
}

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      systemNavigationBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      statusBarBrightness: Brightness.dark,
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );
  runApp(const KokuDedektifiApp());
}

class KokuDedektifiApp extends StatelessWidget {
  const KokuDedektifiApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Koku Dedektifi',
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0D0B0F),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF131018),
          elevation: 0,
          surfaceTintColor: Colors.transparent,
        ),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFC8A97E),
          secondary: Color(0xFF9B6FA0),
          surface: Color(0xFF17131C),
        ),
      ),
      home: const KokuWebShell(),
    );
  }
}

class KokuWebShell extends StatefulWidget {
  const KokuWebShell({super.key});

  @override
  State<KokuWebShell> createState() => _KokuWebShellState();
}

class _KokuWebShellState extends State<KokuWebShell> {
  late final WebViewController _controller;
  int _progress = 0;
  bool _hasError = false;
  bool _canGoBack = false;
  String _errorMessage = '';

  @override
  void initState() {
    super.initState();
    _initWebView();
  }

  void _initWebView() {
    final WebViewController controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF0D0B0F))
      ..addJavaScriptChannel(
        'KokuMobileBridge',
        onMessageReceived: (JavaScriptMessage message) {
          _handleMobileBridgeMessage(message.message);
        },
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (int progress) {
            if (!mounted) return;
            setState(() {
              _progress = progress;
            });
          },
          onPageStarted: (String url) {
            if (!mounted) return;
            setState(() {
              _hasError = false;
              _errorMessage = '';
            });
          },
          onPageFinished: (String url) {
            if (!mounted) return;
            setState(() {
              _progress = 100;
            });
            _bindMobileBridge();
            _syncNavState();
          },
          onNavigationRequest: (NavigationRequest request) async {
            if (!shouldOpenExternally(request.url)) {
              return NavigationDecision.navigate;
            }

            final Uri? uri = Uri.tryParse(request.url);
            if (uri == null) {
              _showToast('Baglanti acilamadi.');
              return NavigationDecision.prevent;
            }

            final bool opened = await _openExternal(uri);
            if (!opened) {
              _showToast('Baglanti dis uygulamada acilamadi.');
            }
            return NavigationDecision.prevent;
          },
          onWebResourceError: (WebResourceError error) {
            if (!mounted) return;
            setState(() {
              _hasError = true;
              _errorMessage = error.description;
            });
          },
          onUrlChange: (UrlChange change) {
            if (!mounted) return;
            _syncNavState();
          },
        ),
      )
      ..loadRequest(Uri.parse(kAppUrl));

    if (controller.platform is AndroidWebViewController) {
      final AndroidWebViewController androidController =
          controller.platform as AndroidWebViewController;
      AndroidWebViewController.enableDebugging(true);
      androidController.setMediaPlaybackRequiresUserGesture(false);
      androidController.setOnPlatformPermissionRequest(
        (request) {
          // Camera/microphone requests are needed for photo capture flows.
          request.grant();
        },
      );
    }

    _controller = controller;
  }

  Future<void> _bindMobileBridge() async {
    try {
      await _controller.runJavaScript(
        '''
(() => {
  if (!window.KokuMobile) {
    window.KokuMobile = {};
  }
  window.KokuMobile.post = function post(payload) {
    try {
      if (!window.KokuMobileBridge || !window.KokuMobileBridge.postMessage) return;
      window.KokuMobileBridge.postMessage(JSON.stringify(payload || {}));
    } catch (_) {}
  };
})();
''',
      );
    } catch (_) {
      // Bridge injection should never block app flow.
    }
  }

  Future<void> _handleMobileBridgeMessage(String rawMessage) async {
    Map<String, dynamic> payload = <String, dynamic>{};
    try {
      final dynamic parsed = jsonDecode(rawMessage);
      if (parsed is Map<String, dynamic>) {
        payload = parsed;
      }
    } catch (_) {
      // Ignore malformed bridge payloads.
    }

    final String action = (payload['action'] ?? payload['type'] ?? '')
        .toString()
        .trim()
        .toLowerCase();
    if (action.isEmpty) return;

    if (!kMobileBillingEnabled) {
      if (<String>{
        'open_paywall',
        'open_billing',
        'start_subscription',
        'restore_purchase',
      }.contains(action)) {
        _showToast('Mobil satin alma altyapisi prelaunch modunda.');
      }
      return;
    }

    if (!<String>{
      'revenuecat',
      'adapty',
      'native_iap',
    }.contains(kMobileBillingProvider)) {
      _showToast('MOBILE_BILLING_PROVIDER tanimsiz.');
      return;
    }

    if (kMobileBillingProvider == 'revenuecat' &&
        kMobileRevenuecatPublicSdkKey.trim().isEmpty) {
      _showToast('RevenueCat anahtari eksik.');
      return;
    }
    if (kMobileBillingProvider == 'adapty' &&
        kMobileAdaptyPublicSdkKey.trim().isEmpty) {
      _showToast('Adapty anahtari eksik.');
      return;
    }

    final String paywallUrl = payload['paywallUrl']?.toString().trim() ?? '';
    final String checkoutUrl = payload['checkoutUrl']?.toString().trim() ?? '';
    final String targetUrl = paywallUrl.isNotEmpty
        ? paywallUrl
        : checkoutUrl.isNotEmpty
            ? checkoutUrl
            : kMobilePaywallUrl;

    if (targetUrl.isEmpty) {
      _showToast('Paywall URL tanimsiz. Prelaunch ayarlarini kontrol et.');
      return;
    }

    final Uri? uri = Uri.tryParse(targetUrl);
    if (uri == null) {
      _showToast('Paywall URL gecersiz.');
      return;
    }

    final bool opened = await _openExternal(uri);
    if (!opened) {
      _showToast('Paywall acilamadi.');
    }
  }

  Future<void> _syncNavState() async {
    final bool canGoBack = await _controller.canGoBack();
    if (!mounted) return;
    setState(() {
      _canGoBack = canGoBack;
    });
  }

  Future<bool> _openExternal(Uri uri) async {
    try {
      final bool opened = await launchUrl(
        uri,
        mode: LaunchMode.externalApplication,
      );
      if (opened) return true;

      if (isHttpOrHttps(uri)) {
        return launchUrl(uri, mode: LaunchMode.platformDefault);
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  void _showToast(String text) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          behavior: SnackBarBehavior.floating,
          content: Text(text),
        ),
      );
  }

  Future<void> _reload() async {
    await _controller.reload();
    await _syncNavState();
  }

  Future<bool> _handleBack() async {
    if (_canGoBack) {
      await _controller.goBack();
      await _syncNavState();
      return false;
    }

    final bool canGoBack = await _controller.canGoBack();
    if (canGoBack) {
      await _controller.goBack();
      await _syncNavState();
      return false;
    }

    return true;
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (bool didPop, Object? result) async {
        if (didPop) return;

        final bool shouldExit = await _handleBack();
        if (shouldExit && context.mounted) {
          Navigator.of(context).maybePop();
        }
      },
      child: Scaffold(
        body: Stack(
          children: <Widget>[
            Positioned.fill(
              child: WebViewWidget(controller: _controller),
            ),
            if (_progress < 100)
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: SafeArea(
                  bottom: false,
                  child: LinearProgressIndicator(
                    value: _progress / 100,
                    minHeight: 2,
                    backgroundColor: const Color(0x332E2630),
                    valueColor: const AlwaysStoppedAnimation<Color>(
                      Color(0xFFC8A97E),
                    ),
                  ),
                ),
              ),
            if (_hasError)
              Positioned.fill(
                child: Container(
                  color: const Color(0xEE0D0B0F),
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: <Widget>[
                      const Icon(
                        Icons.wifi_off_rounded,
                        size: 42,
                        color: Color(0xFFC8A97E),
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'Baglanti sorunu olustu',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _errorMessage.isEmpty
                            ? 'Lutfen internetini kontrol edip tekrar dene.'
                            : _errorMessage,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Color(0xFFB7AFC0),
                          height: 1.35,
                        ),
                      ),
                      const SizedBox(height: 14),
                      Wrap(
                        spacing: 10,
                        alignment: WrapAlignment.center,
                        children: <Widget>[
                          FilledButton(
                            onPressed: _reload,
                            child: const Text('Tekrar Dene'),
                          ),
                          OutlinedButton(
                            onPressed: () => _controller.loadRequest(Uri.parse(kAppUrl)),
                            child: const Text('Ana Sayfaya Don'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

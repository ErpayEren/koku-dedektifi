import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'screens/native_core_shell.dart';

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
    const Color bg = Color(0xFF0D0B0F);
    const Color surface = Color(0xFF17131C);
    const Color gold = Color(0xFFC9A96E);

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Koku Dedektifi',
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: bg,
        colorScheme: const ColorScheme.dark(
          primary: gold,
          secondary: Color(0xFFA78BFA),
          surface: surface,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.transparent,
          surfaceTintColor: Colors.transparent,
          systemOverlayStyle: SystemUiOverlayStyle.light,
        ),
        cardTheme: CardThemeData(
          color: surface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
            side: const BorderSide(color: Color.fromRGBO(255, 255, 255, 0.08)),
          ),
        ),
        snackBarTheme: const SnackBarThemeData(
          behavior: SnackBarBehavior.floating,
          backgroundColor: surface,
          contentTextStyle: TextStyle(color: Color(0xFFEBE4D8)),
        ),
      ),
      home: const NativeCoreShell(),
    );
  }
}

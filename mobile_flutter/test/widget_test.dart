import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:koku_dedektifi_mobile/main.dart';

void main() {
  testWidgets('native app shell renders brand text', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    await tester.pumpWidget(const KokuDedektifiApp());
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.textContaining('Koku'), findsWidgets);
    expect(find.byType(NavigationBar), findsOneWidget);
  });
}

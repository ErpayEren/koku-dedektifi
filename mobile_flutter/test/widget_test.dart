import 'package:flutter_test/flutter_test.dart';

import 'package:koku_dedektifi_mobile/main.dart';

void main() {
  test('default app url uses https', () {
    expect(kAppUrl, startsWith('https://'));
  });

  test('trusted domain stays in app', () {
    expect(
      shouldOpenExternally('https://koku-dedektifi.vercel.app/api/billing'),
      isFalse,
    );
  });

  test('external domain opens externally', () {
    expect(
      shouldOpenExternally('https://example.com/some-page'),
      isTrue,
    );
  });

  test('non-http schemes open externally', () {
    expect(shouldOpenExternally('mailto:hello@koku-dedektifi.com'), isTrue);
  });
}

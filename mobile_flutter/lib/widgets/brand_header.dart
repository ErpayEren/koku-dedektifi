import 'package:flutter/material.dart';

class BrandHeader extends StatelessWidget {
  const BrandHeader({
    super.key,
    this.compact = false,
  });

  final bool compact;

  @override
  Widget build(BuildContext context) {
    final double fontSize = compact ? 22 : 28;
    final double markSize = compact ? 52 : 64;

    return Row(
      children: <Widget>[
        _BrandMark(size: markSize),
        const SizedBox(width: 14),
        Text.rich(
          TextSpan(
            children: <InlineSpan>[
              TextSpan(
                text: 'Koku ',
                style: TextStyle(
                  color: const Color(0xFFEBE4D8),
                  fontSize: fontSize,
                  fontStyle: FontStyle.italic,
                  fontWeight: FontWeight.w500,
                ),
              ),
              TextSpan(
                text: 'Dedektifi',
                style: TextStyle(
                  color: const Color(0xFFC9A96E),
                  fontSize: fontSize,
                  fontStyle: FontStyle.italic,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _BrandMark extends StatelessWidget {
  const _BrandMark({required this.size});

  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _BrandMarkPainter(),
      ),
    );
  }
}

class _BrandMarkPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final Offset center = Offset(size.width / 2, size.height / 2);
    final double radius = size.width * 0.28;
    final double nodeRadius = size.width * 0.055;
    final double markedNodeRadius = size.width * 0.09;

    final Paint glowPaint = Paint()
      ..color = const Color(0x44C9A96E)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 12);

    final Paint strokePaint = Paint()
      ..color = const Color(0xFFC9A96E)
      ..style = PaintingStyle.stroke
      ..strokeWidth = size.width * 0.045
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final Paint fillPaint = Paint()
      ..color = const Color(0xFFC9A96E)
      ..style = PaintingStyle.fill;

    final List<Offset> points = <Offset>[
      Offset(center.dx, center.dy - radius),
      Offset(center.dx + radius * 0.86, center.dy - radius * 0.5),
      Offset(center.dx + radius * 0.86, center.dy + radius * 0.5),
      Offset(center.dx, center.dy + radius),
      Offset(center.dx - radius * 0.86, center.dy + radius * 0.5),
      Offset(center.dx - radius * 0.86, center.dy - radius * 0.5),
    ];

    final Path path = Path()..moveTo(points.first.dx, points.first.dy);
    for (int i = 1; i < points.length; i++) {
      path.lineTo(points[i].dx, points[i].dy);
    }
    path.close();

    canvas.drawPath(path, glowPaint);
    canvas.drawPath(path, strokePaint);

    for (int i = 0; i < points.length; i++) {
      canvas.drawCircle(
        points[i],
        i == 0 || i == 3 ? markedNodeRadius : nodeRadius,
        fillPaint,
      );
    }

    _paintLetter(canvas, size, points[0], 'N');
    _paintLetter(canvas, size, points[3], 'N');
  }

  void _paintLetter(Canvas canvas, Size size, Offset center, String value) {
    final TextPainter painter = TextPainter(
      text: TextSpan(
        text: value,
        style: TextStyle(
          color: const Color(0xFF09080A),
          fontWeight: FontWeight.w900,
          fontSize: size.width * 0.14,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();

    painter.paint(
      canvas,
      Offset(center.dx - painter.width / 2, center.dy - painter.height / 2),
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

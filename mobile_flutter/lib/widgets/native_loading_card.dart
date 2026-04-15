import 'package:flutter/material.dart';

class NativeLoadingCard extends StatelessWidget {
  const NativeLoadingCard({
    super.key,
    required this.stage,
  });

  final String stage;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(22),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            const Text(
              'ANALİZ İŞLENİYOR',
              style: TextStyle(
                color: Color(0xFFC9A96E),
                letterSpacing: 3.2,
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 18),
            Container(
              height: 18,
              width: 124,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(999),
              ),
            ),
            const SizedBox(height: 12),
            Container(
              height: 56,
              width: double.infinity,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: <Color>[
                    Colors.white.withValues(alpha: 0.06),
                    const Color(0xFFA78BFA).withValues(alpha: 0.12),
                    const Color(0xFFC9A96E).withValues(alpha: 0.08),
                    Colors.white.withValues(alpha: 0.06),
                  ],
                ),
                borderRadius: BorderRadius.circular(20),
              ),
            ),
            const SizedBox(height: 14),
            Text(
              stage,
              style: const TextStyle(
                color: Color(0xFFA29BAF),
                fontSize: 15,
                height: 1.45,
              ),
            ),
            const SizedBox(height: 20),
            LayoutBuilder(
              builder: (BuildContext context, BoxConstraints constraints) {
                final bool stacked = constraints.maxWidth < 760;
                if (stacked) {
                  return const Column(
                    children: <Widget>[
                      _SkeletonPanel(title: 'Nota Piramidi'),
                      SizedBox(height: 12),
                      _SkeletonPanel(title: 'Moleküller'),
                      SizedBox(height: 12),
                      _SkeletonPanel(title: 'Benzer Profiller'),
                      SizedBox(height: 12),
                      _WheelSkeleton(),
                    ],
                  );
                }

                return const Column(
                  children: <Widget>[
                    Row(
                      children: <Widget>[
                        Expanded(child: _SkeletonPanel(title: 'Nota Piramidi')),
                        SizedBox(width: 12),
                        Expanded(child: _SkeletonPanel(title: 'Moleküller')),
                      ],
                    ),
                    SizedBox(height: 12),
                    Row(
                      children: <Widget>[
                        Expanded(child: _SkeletonPanel(title: 'Benzer Profiller')),
                        SizedBox(width: 12),
                        Expanded(child: _WheelSkeleton()),
                      ],
                    ),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _SkeletonPanel extends StatelessWidget {
  const _SkeletonPanel({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            title,
            style: const TextStyle(
              color: Color(0xFFC9A96E),
              fontSize: 12,
              letterSpacing: 2,
            ),
          ),
          const SizedBox(height: 12),
          ...List<Widget>.generate(
            4,
            (int index) => Container(
              margin: const EdgeInsets.only(bottom: 10),
              height: 12,
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.09),
                borderRadius: BorderRadius.circular(999),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _WheelSkeleton extends StatelessWidget {
  const _WheelSkeleton();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 172,
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(18),
      ),
      child: const Center(
        child: SizedBox(
          height: 76,
          width: 76,
          child: CircularProgressIndicator(
            strokeWidth: 3.4,
            valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFC9A96E)),
          ),
        ),
      ),
    );
  }
}

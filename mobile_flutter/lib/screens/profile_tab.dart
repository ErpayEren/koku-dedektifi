import 'package:flutter/material.dart';

import '../widgets/common.dart';

class ProfileTab extends StatelessWidget {
  const ProfileTab({
    super.key,
    required this.analysisCount,
    required this.wardrobeCount,
  });

  final int analysisCount;
  final int wardrobeCount;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 28),
      children: <Widget>[
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                const SectionTitle(title: 'Native Core Durumu'),
                const SizedBox(height: 12),
                const Text(
                  'Mobil uygulama artık WebView sarmalayıcı değil. Native Flutter ekranları doğrudan analiz API\'ine ve yerel depolamaya bağlanıyor.',
                  style: TextStyle(color: Color(0xFFA29BAF), height: 1.45),
                ),
                const SizedBox(height: 18),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: <Widget>[
                    InfoChip(label: '$analysisCount analiz'),
                    InfoChip(label: '$wardrobeCount dolap kaydı'),
                    const InfoChip(label: 'Native çekirdek aktif'),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

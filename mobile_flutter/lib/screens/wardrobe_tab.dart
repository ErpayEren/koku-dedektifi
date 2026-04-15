import 'package:flutter/material.dart';

import '../models/analysis_result.dart';
import '../widgets/common.dart';

class WardrobeTab extends StatelessWidget {
  const WardrobeTab({
    super.key,
    required this.wardrobe,
    required this.history,
    required this.onOpen,
  });

  final List<WardrobeEntry> wardrobe;
  final List<AnalysisResultModel> history;
  final ValueChanged<AnalysisResultModel> onOpen;

  @override
  Widget build(BuildContext context) {
    if (wardrobe.isEmpty) {
      return const EmptyStateCard(
        icon: Icons.inventory_2_outlined,
        title: 'Dolabın henüz boş',
        body: 'Analiz yaptıktan sonra parfümleri buraya ekleyebilirsin.',
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 28),
      itemBuilder: (BuildContext context, int index) {
        final WardrobeEntry item = wardrobe[index];
        final AnalysisResultModel? source = history.cast<AnalysisResultModel?>().firstWhere(
              (AnalysisResultModel? analysis) => analysis?.id == item.analysisId,
              orElse: () => null,
            );

        return InkWell(
          borderRadius: BorderRadius.circular(22),
          onTap: source == null ? null : () => onOpen(source),
          child: Ink(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: const Color(0xFF17131C),
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
            ),
            child: Row(
              children: <Widget>[
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    color: const Color(0xFFC9A96E).withValues(alpha: 0.12),
                  ),
                  child: const Icon(
                    Icons.inventory_2_outlined,
                    color: Color(0xFFC9A96E),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        '${item.brand.isNotEmpty ? '${item.brand} ' : ''}${item.name}',
                        style: const TextStyle(
                          color: Color(0xFFEBE4D8),
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 6),
                      if (item.family.isNotEmpty)
                        Text(
                          item.family,
                          style: const TextStyle(color: Color(0xFFA29BAF)),
                        ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right, color: Color(0xFFA29BAF)),
              ],
            ),
          ),
        );
      },
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemCount: wardrobe.length,
    );
  }
}

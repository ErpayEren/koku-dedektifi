import 'package:flutter/material.dart';

import '../models/analysis_result.dart';
import '../widgets/common.dart';

class HistoryTab extends StatelessWidget {
  const HistoryTab({
    super.key,
    required this.history,
    required this.isInWardrobe,
    required this.onOpen,
  });

  final List<AnalysisResultModel> history;
  final bool Function(String analysisId) isInWardrobe;
  final ValueChanged<AnalysisResultModel> onOpen;

  @override
  Widget build(BuildContext context) {
    if (history.isEmpty) {
      return const EmptyStateCard(
        icon: Icons.history,
        title: 'Henüz geçmiş yok',
        body: 'İlk analizi yaptığında sonuçlar burada birikir.',
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 28),
      itemBuilder: (BuildContext context, int index) {
        final AnalysisResultModel item = history[index];
        return InkWell(
          borderRadius: BorderRadius.circular(22),
          onTap: () => onOpen(item),
          child: Ink(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: const Color(0xFF17131C),
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Row(
                  children: <Widget>[
                    Expanded(
                      child: Text(
                        '${item.brand.isNotEmpty ? '${item.brand} ' : ''}${item.name}',
                        style: const TextStyle(
                          color: Color(0xFFEBE4D8),
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    if (isInWardrobe(item.id))
                      const Icon(Icons.inventory_2, color: Color(0xFFC9A96E), size: 18),
                  ],
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: <Widget>[
                    if (item.family.isNotEmpty) InfoChip(label: item.family),
                    if (item.genderProfile.isNotEmpty) InfoChip(label: item.genderProfile),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  item.description,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xFFA29BAF),
                    height: 1.45,
                  ),
                ),
              ],
            ),
          ),
        );
      },
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemCount: history.length,
    );
  }
}

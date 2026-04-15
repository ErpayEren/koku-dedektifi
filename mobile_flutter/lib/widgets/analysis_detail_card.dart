import 'package:flutter/material.dart';

import '../models/analysis_result.dart';
import '../services/api_service.dart';
import '../services/local_store_service.dart';
import 'common.dart';

class AnalysisDetailCard extends StatefulWidget {
  const AnalysisDetailCard({
    super.key,
    required this.result,
    required this.api,
    required this.store,
    required this.inWardrobe,
    required this.onToggleWardrobe,
  });

  final AnalysisResultModel result;
  final ApiService api;
  final LocalStoreService store;
  final bool inWardrobe;
  final Future<void> Function() onToggleWardrobe;

  @override
  State<AnalysisDetailCard> createState() => _AnalysisDetailCardState();
}

class _AnalysisDetailCardState extends State<AnalysisDetailCard> {
  AnalysisVoteSummary? _voteSummary;
  String? _userVote;
  bool _voteBusy = false;

  @override
  void initState() {
    super.initState();
    _hydrateVote();
  }

  Future<void> _hydrateVote() async {
    final String? saved = await widget.store.getVote(widget.result.id);
    AnalysisVoteSummary? summary;
    try {
      summary = await widget.api.fetchVoteSummary(widget.result.id);
    } catch (_) {
      summary = null;
    }
    if (!mounted) return;
    setState(() {
      _userVote = saved;
      _voteSummary = summary;
    });
  }

  Future<void> _vote(String vote) async {
    setState(() {
      _voteBusy = true;
    });
    try {
      final AnalysisVoteSummary summary = await widget.api.submitVote(
        analysisId: widget.result.id,
        vote: vote,
        allowUpdate: true,
      );
      await widget.store.saveVote(widget.result.id, vote);
      if (mounted) {
        setState(() {
          _userVote = vote;
          _voteSummary = summary;
        });
      } else {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Teşekkürler — bu verilerle analizleri iyileştiriyoruz.'),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString().replaceFirst('Exception: ', ''))),
      );
    } finally {
      if (mounted) {
        setState(() {
          _voteBusy = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final AnalysisResultModel result = widget.result;
    final List<String> occasions = result.occasions.isNotEmpty
        ? result.occasions
        : (result.occasion.isNotEmpty ? <String>[result.occasion] : const <String>[]);
    final String styleText = result.styleRecommendation.isNotEmpty
        ? result.styleRecommendation
        : 'Modern, dengeli ve karakterli';

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(22),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        '${result.brand.isNotEmpty ? '${result.brand} ' : ''}${result.name}',
                        style: const TextStyle(
                          fontSize: 30,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFFEBE4D8),
                          height: 1.03,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: <Widget>[
                          _TrustBadge(trust: result.trust, voteSummary: _voteSummary),
                          if (result.family.isNotEmpty) InfoChip(label: result.family),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                FilledButton.tonalIcon(
                  onPressed: widget.onToggleWardrobe,
                  icon: Icon(widget.inWardrobe ? Icons.check_circle : Icons.add_box_outlined),
                  label: Text(widget.inWardrobe ? 'Dolapta' : 'Dolaba ekle'),
                  style: FilledButton.styleFrom(
                    backgroundColor: widget.inWardrobe
                        ? const Color(0xFFC9A96E).withValues(alpha: 0.16)
                        : Colors.white.withValues(alpha: 0.05),
                    foregroundColor: widget.inWardrobe
                        ? const Color(0xFFC9A96E)
                        : const Color(0xFFEBE4D8),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            Text(
              result.description,
              style: const TextStyle(
                color: Color(0xFFA29BAF),
                fontSize: 15,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 18),
            const SectionTitle(title: 'Sana Yakışır mı?'),
            const SizedBox(height: 12),
            LayoutBuilder(
              builder: (BuildContext context, BoxConstraints constraints) {
                final bool stacked = constraints.maxWidth < 560;
                final List<Widget> cards = <Widget>[
                  _MetaCard(title: 'Cinsiyet', value: result.genderProfile),
                  _MetaCard(
                    title: 'Ortam',
                    value: occasions.isNotEmpty ? occasions.join(', ') : 'Günlük kullanım',
                  ),
                  _MetaCard(title: 'Stil', value: styleText),
                ];

                if (stacked) {
                  return Column(
                    children: cards
                        .map(
                          (Widget child) => Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: child,
                          ),
                        )
                        .toList(growable: false),
                  );
                }

                return Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: cards,
                );
              },
            ),
            if (result.scoreCards != null) ...<Widget>[
              const SizedBox(height: 18),
              const SectionTitle(title: 'Skor Kartları'),
              const SizedBox(height: 12),
              _ScoreRow(
                label: 'Değer',
                value: result.scoreCards!.value,
                note: 'Fiyat/performans dengesi',
              ),
              const SizedBox(height: 10),
              _ScoreRow(
                label: 'Özgünlük',
                value: result.scoreCards!.uniqueness,
                note: 'Kalabalıktan ayrışma gücü',
              ),
              const SizedBox(height: 10),
              _ScoreRow(
                label: 'Giyilebilirlik',
                value: result.scoreCards!.wearability,
                note: 'Günlük kullanım esnekliği',
              ),
            ],
            if (result.pyramid != null) ...<Widget>[
              const SizedBox(height: 18),
              const SectionTitle(title: 'Nota Piramidi'),
              const SizedBox(height: 12),
              _PyramidRow(label: 'Üst', notes: result.pyramid!.top),
              const SizedBox(height: 10),
              _PyramidRow(label: 'Kalp', notes: result.pyramid!.middle),
              const SizedBox(height: 10),
              _PyramidRow(label: 'Alt', notes: result.pyramid!.base),
            ],
            if (result.molecules.isNotEmpty) ...<Widget>[
              const SizedBox(height: 18),
              const SectionTitle(title: 'Anahtar Moleküller'),
              const SizedBox(height: 12),
              ...result.molecules.take(5).map((MoleculeItem molecule) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _MoleculeRow(molecule: molecule),
                );
              }),
            ],
            if (result.similarFragrances.isNotEmpty) ...<Widget>[
              const SizedBox(height: 18),
              const SectionTitle(title: 'Benzer Profiller'),
              const SizedBox(height: 12),
              ...result.similarFragrances.take(6).map((SimilarFragrance item) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.04),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(
                          '${item.brand.isNotEmpty ? '${item.brand} ' : ''}${item.name}',
                          style: const TextStyle(
                            color: Color(0xFFEBE4D8),
                            fontSize: 17,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        if (item.reason.isNotEmpty) ...<Widget>[
                          const SizedBox(height: 6),
                          Text(
                            item.reason,
                            style: const TextStyle(
                              color: Color(0xFFA29BAF),
                              height: 1.45,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              }),
            ],
            const SizedBox(height: 18),
            const SectionTitle(title: 'Bu analiz ne kadar doğru?'),
            const SizedBox(height: 12),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: <Widget>[
                _VoteButton(
                  label: 'Doğru',
                  icon: Icons.thumb_up_alt_outlined,
                  active: _userVote == 'accurate',
                  onTap: _voteBusy ? null : () => _vote('accurate'),
                ),
                _VoteButton(
                  label: 'Kısmen',
                  icon: Icons.thumbs_up_down_outlined,
                  active: _userVote == 'partial',
                  onTap: _voteBusy ? null : () => _vote('partial'),
                ),
                _VoteButton(
                  label: 'Yanlış',
                  icon: Icons.thumb_down_alt_outlined,
                  active: _userVote == 'wrong',
                  onTap: _voteBusy ? null : () => _vote('wrong'),
                ),
              ],
            ),
            if (_voteSummary != null && _voteSummary!.total >= 50) ...<Widget>[
              const SizedBox(height: 12),
              Text(
                '${_voteSummary!.total} kullanıcıdan ${_voteSummary!.accurate}\'i doğru buldu (%${_voteSummary!.accuratePct})',
                style: const TextStyle(color: Color(0xFFA29BAF)),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _MetaCard extends StatelessWidget {
  const _MetaCard({required this.title, required this.value});

  final String title;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minWidth: 150),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            title,
            style: const TextStyle(color: Color(0xFF8C8397), fontSize: 12),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(
              color: Color(0xFFEBE4D8),
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _ScoreRow extends StatelessWidget {
  const _ScoreRow({
    required this.label,
    required this.value,
    required this.note,
  });

  final String label;
  final int value;
  final String note;

  @override
  Widget build(BuildContext context) {
    final double progress = value.clamp(0, 10) / 10;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Text(
                label,
                style: const TextStyle(
                  color: Color(0xFFEBE4D8),
                  fontWeight: FontWeight.w700,
                ),
              ),
              const Spacer(),
              Text(
                '$value/10',
                style: const TextStyle(
                  color: Color(0xFFC9A96E),
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 7,
              backgroundColor: Colors.white.withValues(alpha: 0.08),
              valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFFC9A96E)),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            note,
            style: const TextStyle(color: Color(0xFFA29BAF), fontSize: 12),
          ),
        ],
      ),
    );
  }
}

class _PyramidRow extends StatelessWidget {
  const _PyramidRow({required this.label, required this.notes});

  final String label;
  final List<String> notes;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            label,
            style: const TextStyle(
              color: Color(0xFFC9A96E),
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: notes.map((String item) => InfoChip(label: item)).toList(growable: false),
          ),
        ],
      ),
    );
  }
}

class _MoleculeRow extends StatelessWidget {
  const _MoleculeRow({required this.molecule});

  final MoleculeItem molecule;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Expanded(
                child: Text(
                  molecule.name,
                  style: const TextStyle(
                    color: Color(0xFFEBE4D8),
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                  ),
                ),
              ),
              if (molecule.evidenceLabel.isNotEmpty) InfoChip(label: molecule.evidenceLabel),
            ],
          ),
          if (molecule.effect.isNotEmpty) ...<Widget>[
            const SizedBox(height: 8),
            Text(
              molecule.effect,
              style: const TextStyle(
                color: Color(0xFFA29BAF),
                height: 1.45,
              ),
            ),
          ],
          if (molecule.matchedNotes.isNotEmpty) ...<Widget>[
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: molecule.matchedNotes
                  .map((String item) => InfoChip(label: item))
                  .toList(growable: false),
            ),
          ],
        ],
      ),
    );
  }
}

class _VoteButton extends StatelessWidget {
  const _VoteButton({
    required this.label,
    required this.icon,
    required this.active,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool active;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: onTap,
      icon: Icon(icon, size: 18),
      label: Text(label),
      style: OutlinedButton.styleFrom(
        foregroundColor: active ? const Color(0xFFC9A96E) : const Color(0xFFEBE4D8),
        side: BorderSide(
          color: active
              ? const Color(0xFFC9A96E).withValues(alpha: 0.6)
              : Colors.white.withValues(alpha: 0.1),
        ),
        backgroundColor: active
            ? const Color(0xFFC9A96E).withValues(alpha: 0.12)
            : Colors.white.withValues(alpha: 0.03),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    );
  }
}

class _TrustBadge extends StatelessWidget {
  const _TrustBadge({
    required this.trust,
    required this.voteSummary,
  });

  final AnalysisTrust trust;
  final AnalysisVoteSummary? voteSummary;

  @override
  Widget build(BuildContext context) {
    String label;
    Color border;
    Color text;

    if ((voteSummary?.total ?? 0) > 5) {
      label = '${voteSummary!.total} kullanıcı doğruladı';
      border = const Color(0xFF3DBE88).withValues(alpha: 0.35);
      text = const Color(0xFF8BE5B2);
    } else if (trust.hasDbMatch) {
      label = 'Veritabanı eşleşmesi';
      border = const Color(0xFF6AA8FF).withValues(alpha: 0.35);
      text = const Color(0xFFA7C9FF);
    } else {
      label = 'AI tahmini — doğruluk değişken';
      border = Colors.white.withValues(alpha: 0.14);
      text = const Color(0xFFA29BAF);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        color: const Color(0xFF110F15),
        border: Border.all(color: border),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: text,
          fontSize: 11,
          fontStyle: trust.hasDbMatch || (voteSummary?.total ?? 0) > 5
              ? FontStyle.normal
              : FontStyle.italic,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

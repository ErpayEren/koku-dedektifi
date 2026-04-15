import 'package:flutter/material.dart';

import '../models/analysis_result.dart';
import '../services/api_service.dart';
import '../services/local_store_service.dart';
import '../widgets/brand_header.dart';
import 'analyze_tab.dart';
import 'history_tab.dart';
import 'profile_tab.dart';
import 'wardrobe_tab.dart';

class NativeCoreShell extends StatefulWidget {
  const NativeCoreShell({super.key});

  @override
  State<NativeCoreShell> createState() => _NativeCoreShellState();
}

class _NativeCoreShellState extends State<NativeCoreShell> {
  final ApiService _api = ApiService();
  final LocalStoreService _store = LocalStoreService();

  int _index = 0;
  List<AnalysisResultModel> _history = const <AnalysisResultModel>[];
  List<WardrobeEntry> _wardrobe = const <WardrobeEntry>[];
  AnalysisResultModel? _latestResult;
  bool _booting = true;

  @override
  void initState() {
    super.initState();
    _hydrate();
  }

  Future<void> _hydrate() async {
    final List<AnalysisResultModel> history = await _store.loadHistory();
    final List<WardrobeEntry> wardrobe = await _store.loadWardrobe();
    if (!mounted) return;
    setState(() {
      _history = history;
      _wardrobe = wardrobe;
      _latestResult = history.isNotEmpty ? history.first : null;
      _booting = false;
    });
  }

  Future<void> _handleAnalysisSaved(AnalysisResultModel result) async {
    await _store.saveAnalysis(result);
    final List<AnalysisResultModel> history = await _store.loadHistory();
    if (!mounted) return;
    setState(() {
      _history = history;
      _latestResult = result;
      _index = 0;
    });
  }

  Future<void> _toggleWardrobe(AnalysisResultModel result) async {
    final bool added = await _store.toggleWardrobe(result);
    final List<WardrobeEntry> wardrobe = await _store.loadWardrobe();
    if (!mounted) return;
    setState(() {
      _wardrobe = wardrobe;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(added ? 'Dolaba eklendi.' : 'Dolaptan kaldırıldı.'),
      ),
    );
  }

  void _openAnalysis(AnalysisResultModel result) {
    setState(() {
      _latestResult = result;
      _index = 0;
    });
  }

  bool _isInWardrobe(String analysisId) {
    return _wardrobe.any((WardrobeEntry item) => item.analysisId == analysisId);
  }

  @override
  Widget build(BuildContext context) {
    if (_booting) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final List<Widget> pages = <Widget>[
      AnalyzeTab(
        api: _api,
        store: _store,
        initialResult: _latestResult,
        onSaved: _handleAnalysisSaved,
        onToggleWardrobe: _toggleWardrobe,
        isInWardrobe: _isInWardrobe,
      ),
      HistoryTab(
        history: _history,
        isInWardrobe: _isInWardrobe,
        onOpen: _openAnalysis,
      ),
      WardrobeTab(
        wardrobe: _wardrobe,
        history: _history,
        onOpen: _openAnalysis,
      ),
      ProfileTab(
        analysisCount: _history.length,
        wardrobeCount: _wardrobe.length,
      ),
    ];

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          children: <Widget>[
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 18, 20, 0),
              child: BrandHeader(),
            ),
            Expanded(
              child: IndexedStack(
                index: _index,
                children: pages,
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: NavigationBar(
        backgroundColor: const Color(0xFF131018),
        selectedIndex: _index,
        onDestinationSelected: (int value) => setState(() => _index = value),
        destinations: const <NavigationDestination>[
          NavigationDestination(
            icon: Icon(Icons.auto_awesome_outlined),
            selectedIcon: Icon(Icons.auto_awesome),
            label: 'Analiz',
          ),
          NavigationDestination(
            icon: Icon(Icons.history_outlined),
            selectedIcon: Icon(Icons.history),
            label: 'Geçmiş',
          ),
          NavigationDestination(
            icon: Icon(Icons.inventory_2_outlined),
            selectedIcon: Icon(Icons.inventory_2),
            label: 'Dolap',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profil',
          ),
        ],
      ),
    );
  }
}

import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/analysis_result.dart';

class LocalStoreService {
  static const String _historyKey = 'kd_native_history_v1';
  static const String _wardrobeKey = 'kd_native_wardrobe_v1';
  static const String _votesKey = 'kd_native_votes_v1';

  Future<List<AnalysisResultModel>> loadHistory() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    final List<String> raw = prefs.getStringList(_historyKey) ?? const <String>[];
    return raw
        .map((item) => jsonDecode(item))
        .whereType<Map<String, dynamic>>()
        .map(AnalysisResultModel.fromJson)
        .toList(growable: false);
  }

  Future<void> saveAnalysis(AnalysisResultModel result) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    final List<AnalysisResultModel> history = await loadHistory();
    final List<AnalysisResultModel> next = <AnalysisResultModel>[
      result,
      ...history.where((item) => item.id != result.id),
    ].take(30).toList(growable: false);
    await prefs.setStringList(
      _historyKey,
      next.map((item) => jsonEncode(item.toJson())).toList(growable: false),
    );
  }

  Future<List<WardrobeEntry>> loadWardrobe() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    final List<String> raw = prefs.getStringList(_wardrobeKey) ?? const <String>[];
    return raw
        .map((item) => jsonDecode(item))
        .whereType<Map<String, dynamic>>()
        .map(WardrobeEntry.fromJson)
        .toList(growable: false);
  }

  Future<bool> toggleWardrobe(AnalysisResultModel result) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    final List<WardrobeEntry> wardrobe = await loadWardrobe();
    final int index = wardrobe.indexWhere((item) => item.analysisId == result.id);

    if (index >= 0) {
      wardrobe.removeAt(index);
      await prefs.setStringList(
        _wardrobeKey,
        wardrobe.map((item) => jsonEncode(item.toJson())).toList(growable: false),
      );
      return false;
    }

    wardrobe.insert(
      0,
      WardrobeEntry(
        analysisId: result.id,
        name: result.name,
        brand: result.brand,
        family: result.family,
        addedAt: DateTime.now().toIso8601String(),
      ),
    );

    await prefs.setStringList(
      _wardrobeKey,
      wardrobe.map((item) => jsonEncode(item.toJson())).toList(growable: false),
    );
    return true;
  }

  Future<String?> getVote(String analysisId) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    final String? raw = prefs.getString(_votesKey);
    if (raw == null || raw.isEmpty) return null;
    final dynamic parsed = jsonDecode(raw);
    if (parsed is! Map<String, dynamic>) return null;
    return parsed[analysisId]?.toString();
  }

  Future<void> saveVote(String analysisId, String vote) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    final String? raw = prefs.getString(_votesKey);
    final Map<String, dynamic> next = raw == null || raw.isEmpty
        ? <String, dynamic>{}
        : (jsonDecode(raw) as Map<String, dynamic>);
    next[analysisId] = vote;
    await prefs.setString(_votesKey, jsonEncode(next));
  }
}

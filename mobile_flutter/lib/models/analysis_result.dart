class AnalysisScores {
  const AnalysisScores({
    required this.freshness,
    required this.sweetness,
    required this.warmth,
  });

  final int freshness;
  final int sweetness;
  final int warmth;

  factory AnalysisScores.fromJson(Map<String, dynamic> json) {
    return AnalysisScores(
      freshness: (json['freshness'] as num?)?.round() ?? 0,
      sweetness: (json['sweetness'] as num?)?.round() ?? 0,
      warmth: (json['warmth'] as num?)?.round() ?? 0,
    );
  }
}

class AnalysisPyramid {
  const AnalysisPyramid({
    required this.top,
    required this.middle,
    required this.base,
  });

  final List<String> top;
  final List<String> middle;
  final List<String> base;

  factory AnalysisPyramid.fromJson(Map<String, dynamic> json) {
    List<String> toStringList(dynamic value) {
      if (value is! List) return const <String>[];
      return value.whereType<String>().toList(growable: false);
    }

    return AnalysisPyramid(
      top: toStringList(json['top']),
      middle: toStringList(json['middle']),
      base: toStringList(json['base']),
    );
  }
}

class AnalysisPersona {
  const AnalysisPersona({
    required this.gender,
    required this.age,
    required this.vibe,
    required this.occasions,
    required this.season,
  });

  final String gender;
  final String age;
  final String vibe;
  final List<String> occasions;
  final String season;

  factory AnalysisPersona.fromJson(Map<String, dynamic> json) {
    return AnalysisPersona(
      gender: json['gender'] as String? ?? '',
      age: json['age'] as String? ?? '',
      vibe: json['vibe'] as String? ?? '',
      occasions: (json['occasions'] as List<dynamic>? ?? const <dynamic>[])
          .whereType<String>()
          .toList(growable: false),
      season: json['season'] as String? ?? '',
    );
  }
}

class TechnicalItem {
  const TechnicalItem({
    required this.label,
    required this.value,
    required this.score,
  });

  final String label;
  final String value;
  final int? score;

  factory TechnicalItem.fromJson(Map<String, dynamic> json) {
    final dynamic rawScore = json['score'];
    return TechnicalItem(
      label: json['label'] as String? ?? '',
      value: json['value'] as String? ?? '',
      score: rawScore is num ? rawScore.round() : null,
    );
  }
}

class MoleculeItem {
  const MoleculeItem({
    required this.name,
    required this.smiles,
    required this.formula,
    required this.family,
    required this.origin,
    required this.note,
    required this.contribution,
  });

  final String name;
  final String smiles;
  final String formula;
  final String family;
  final String origin;
  final String note;
  final String contribution;

  factory MoleculeItem.fromJson(Map<String, dynamic> json) {
    return MoleculeItem(
      name: json['name'] as String? ?? '',
      smiles: json['smiles'] as String? ?? '',
      formula: json['formula'] as String? ?? '',
      family: json['family'] as String? ?? '',
      origin: json['origin'] as String? ?? '',
      note: json['note'] as String? ?? '',
      contribution: json['contribution'] as String? ?? '',
    );
  }
}

class LayeringInfo {
  const LayeringInfo({
    required this.pair,
    required this.result,
  });

  final String pair;
  final String result;

  factory LayeringInfo.fromJson(Map<String, dynamic> json) {
    return LayeringInfo(
      pair: json['pair'] as String? ?? '',
      result: json['result'] as String? ?? '',
    );
  }
}

class AnalysisResultModel {
  const AnalysisResultModel({
    required this.id,
    required this.iconToken,
    required this.name,
    required this.family,
    required this.intensity,
    required this.season,
    required this.occasion,
    required this.description,
    required this.pyramid,
    required this.similar,
    required this.scores,
    required this.persona,
    required this.dupes,
    required this.layering,
    required this.technical,
    required this.molecules,
    required this.createdAt,
  });

  final String id;
  final String iconToken;
  final String name;
  final String family;
  final int intensity;
  final List<String> season;
  final String occasion;
  final String description;
  final AnalysisPyramid? pyramid;
  final List<String> similar;
  final AnalysisScores scores;
  final AnalysisPersona? persona;
  final List<String> dupes;
  final LayeringInfo? layering;
  final List<TechnicalItem> technical;
  final List<MoleculeItem> molecules;
  final String createdAt;

  factory AnalysisResultModel.fromJson(Map<String, dynamic> json) {
    List<String> toStringList(dynamic value) {
      if (value is! List) return const <String>[];
      return value.whereType<String>().toList(growable: false);
    }

    return AnalysisResultModel(
      id: json['id'] as String? ?? '',
      iconToken: json['iconToken'] as String? ?? '',
      name: json['name'] as String? ?? '',
      family: json['family'] as String? ?? '',
      intensity: (json['intensity'] as num?)?.round() ?? 0,
      season: toStringList(json['season']),
      occasion: json['occasion'] as String? ?? '',
      description: json['description'] as String? ?? '',
      pyramid: json['pyramid'] is Map<String, dynamic>
          ? AnalysisPyramid.fromJson(json['pyramid'] as Map<String, dynamic>)
          : null,
      similar: toStringList(json['similar']),
      scores: AnalysisScores.fromJson((json['scores'] as Map<String, dynamic>?) ?? const <String, dynamic>{}),
      persona: json['persona'] is Map<String, dynamic>
          ? AnalysisPersona.fromJson(json['persona'] as Map<String, dynamic>)
          : null,
      dupes: toStringList(json['dupes']),
      layering: json['layering'] is Map<String, dynamic>
          ? LayeringInfo.fromJson(json['layering'] as Map<String, dynamic>)
          : null,
      technical: (json['technical'] as List<dynamic>? ?? const <dynamic>[])
          .whereType<Map<String, dynamic>>()
          .map(TechnicalItem.fromJson)
          .toList(growable: false),
      molecules: (json['molecules'] as List<dynamic>? ?? const <dynamic>[])
          .whereType<Map<String, dynamic>>()
          .map(MoleculeItem.fromJson)
          .toList(growable: false),
      createdAt: json['createdAt'] as String? ?? '',
    );
  }
}

class BarcodeLookupResult {
  const BarcodeLookupResult({
    required this.found,
    required this.perfume,
    required this.family,
    required this.occasion,
    required this.season,
    required this.message,
  });

  final bool found;
  final String perfume;
  final String family;
  final String occasion;
  final List<String> season;
  final String message;

  factory BarcodeLookupResult.fromJson(Map<String, dynamic> json) {
    return BarcodeLookupResult(
      found: json['found'] == true,
      perfume: json['perfume'] as String? ?? '',
      family: json['family'] as String? ?? '',
      occasion: json['occasion'] as String? ?? '',
      season: (json['season'] as List<dynamic>? ?? const <dynamic>[])
          .whereType<String>()
          .toList(growable: false),
      message: json['message'] as String? ?? '',
    );
  }
}

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
    List<String> parse(dynamic value) {
      if (value is! List) return const <String>[];
      return value
          .map((item) => item?.toString().trim() ?? '')
          .where((item) => item.isNotEmpty)
          .toList(growable: false);
    }

    return AnalysisPyramid(
      top: parse(json['top']),
      middle: parse(json['middle'] ?? json['heart']),
      base: parse(json['base']),
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
        'top': top,
        'middle': middle,
        'base': base,
      };
}

class MoleculeItem {
  const MoleculeItem({
    required this.name,
    required this.family,
    required this.effect,
    required this.evidenceLabel,
    required this.percentage,
    required this.matchedNotes,
  });

  final String name;
  final String family;
  final String effect;
  final String evidenceLabel;
  final String percentage;
  final List<String> matchedNotes;

  factory MoleculeItem.fromJson(Map<String, dynamic> json) {
    List<String> parseList(dynamic value) {
      if (value is! List) return const <String>[];
      return value
          .map((item) => item?.toString().trim() ?? '')
          .where((item) => item.isNotEmpty)
          .toList(growable: false);
    }

    return MoleculeItem(
      name: json['name']?.toString() ?? '',
      family: json['family']?.toString() ?? '',
      effect: json['effect']?.toString() ?? json['contribution']?.toString() ?? '',
      evidenceLabel: json['evidenceLabel']?.toString() ?? json['evidence']?.toString() ?? '',
      percentage: json['percentage']?.toString() ?? '',
      matchedNotes: parseList(json['matchedNotes']),
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
        'name': name,
        'family': family,
        'effect': effect,
        'evidenceLabel': evidenceLabel,
        'percentage': percentage,
        'matchedNotes': matchedNotes,
      };
}

class SimilarFragrance {
  const SimilarFragrance({
    required this.name,
    required this.brand,
    required this.reason,
    required this.priceRange,
  });

  final String name;
  final String brand;
  final String reason;
  final String priceRange;

  factory SimilarFragrance.fromJson(Map<String, dynamic> json) {
    return SimilarFragrance(
      name: json['name']?.toString() ?? '',
      brand: json['brand']?.toString() ?? '',
      reason: json['reason']?.toString() ?? '',
      priceRange: json['priceRange']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
        'name': name,
        'brand': brand,
        'reason': reason,
        'priceRange': priceRange,
      };
}

class ScoreCards {
  const ScoreCards({
    required this.value,
    required this.uniqueness,
    required this.wearability,
  });

  final int value;
  final int uniqueness;
  final int wearability;

  factory ScoreCards.fromJson(Map<String, dynamic> json) {
    int parseScore(dynamic value) {
      if (value is num) return value.round();
      return 0;
    }

    return ScoreCards(
      value: parseScore(json['value']),
      uniqueness: parseScore(json['uniqueness']),
      wearability: parseScore(json['wearability']),
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
        'value': value,
        'uniqueness': uniqueness,
        'wearability': wearability,
      };
}

class AnalysisTrust {
  const AnalysisTrust({
    required this.source,
    required this.hasDbMatch,
    required this.voteCount,
    required this.accuratePct,
  });

  final String source;
  final bool hasDbMatch;
  final int voteCount;
  final int accuratePct;

  factory AnalysisTrust.fromJson(Map<String, dynamic> json) {
    return AnalysisTrust(
      source: json['source']?.toString() ?? 'ai',
      hasDbMatch: json['hasDbMatch'] == true,
      voteCount: (json['voteCount'] as num?)?.round() ?? 0,
      accuratePct: (json['accuratePct'] as num?)?.round() ?? 0,
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
        'source': source,
        'hasDbMatch': hasDbMatch,
        'voteCount': voteCount,
        'accuratePct': accuratePct,
      };
}

class AnalysisVoteSummary {
  const AnalysisVoteSummary({
    required this.analysisId,
    required this.total,
    required this.accurate,
    required this.partial,
    required this.wrong,
    required this.accuratePct,
  });

  final String analysisId;
  final int total;
  final int accurate;
  final int partial;
  final int wrong;
  final int accuratePct;

  factory AnalysisVoteSummary.fromJson(Map<String, dynamic> json) {
    return AnalysisVoteSummary(
      analysisId: json['analysisId']?.toString() ?? '',
      total: (json['total'] as num?)?.round() ?? 0,
      accurate: (json['accurate'] as num?)?.round() ?? 0,
      partial: (json['partial'] as num?)?.round() ?? 0,
      wrong: (json['wrong'] as num?)?.round() ?? 0,
      accuratePct: (json['accuratePct'] as num?)?.round() ?? 0,
    );
  }
}

class AnalysisResultModel {
  const AnalysisResultModel({
    required this.id,
    required this.name,
    required this.brand,
    required this.family,
    required this.description,
    required this.genderProfile,
    required this.occasion,
    required this.occasions,
    required this.seasons,
    required this.styleRecommendation,
    required this.pyramid,
    required this.molecules,
    required this.similarFragrances,
    required this.scoreCards,
    required this.trust,
    required this.createdAt,
    required this.inputText,
    required this.analysisMode,
  });

  final String id;
  final String name;
  final String brand;
  final String family;
  final String description;
  final String genderProfile;
  final String occasion;
  final List<String> occasions;
  final List<String> seasons;
  final String styleRecommendation;
  final AnalysisPyramid? pyramid;
  final List<MoleculeItem> molecules;
  final List<SimilarFragrance> similarFragrances;
  final ScoreCards? scoreCards;
  final AnalysisTrust trust;
  final String createdAt;
  final String inputText;
  final String analysisMode;

  factory AnalysisResultModel.fromJson(Map<String, dynamic> json) {
    List<String> parseList(dynamic value) {
      if (value is! List) return const <String>[];
      return value
          .map((item) => item?.toString().trim() ?? '')
          .where((item) => item.isNotEmpty)
          .toList(growable: false);
    }

    final dynamic pyramidJson = json['pyramid'];
    final dynamic scoreCardsJson = json['scoreCards'];
    final dynamic trustJson = json['dataConfidence'];

    return AnalysisResultModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      brand: json['brand']?.toString() ?? '',
      family: json['family']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      genderProfile: json['genderProfile']?.toString() ?? 'Unisex',
      occasion: json['occasion']?.toString() ?? '',
      occasions: parseList(json['occasions']),
      seasons: parseList(json['season']),
      styleRecommendation: json['moodProfile']?.toString().trim().isNotEmpty == true
          ? json['moodProfile'].toString()
          : json['persona'] is Map<String, dynamic>
              ? (json['persona']['vibe']?.toString() ?? '')
              : '',
      pyramid: pyramidJson is Map<String, dynamic> ? AnalysisPyramid.fromJson(pyramidJson) : null,
      molecules: (json['molecules'] is List ? json['molecules'] as List : const <dynamic>[])
          .whereType<Map<String, dynamic>>()
          .map(MoleculeItem.fromJson)
          .toList(growable: false),
      similarFragrances: (json['similarFragrances'] is List ? json['similarFragrances'] as List : const <dynamic>[])
          .whereType<Map<String, dynamic>>()
          .map(SimilarFragrance.fromJson)
          .toList(growable: false),
      scoreCards: scoreCardsJson is Map<String, dynamic> ? ScoreCards.fromJson(scoreCardsJson) : null,
      trust: trustJson is Map<String, dynamic>
          ? AnalysisTrust.fromJson(trustJson)
          : const AnalysisTrust(source: 'ai', hasDbMatch: false, voteCount: 0, accuratePct: 0),
      createdAt: json['createdAt']?.toString() ?? DateTime.now().toIso8601String(),
      inputText: json['inputText']?.toString() ?? '',
      analysisMode: json['analysisMode']?.toString() ?? 'text',
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
        'id': id,
        'name': name,
        'brand': brand,
        'family': family,
        'description': description,
        'genderProfile': genderProfile,
        'occasion': occasion,
        'occasions': occasions,
        'season': seasons,
        'moodProfile': styleRecommendation,
        'pyramid': pyramid?.toJson(),
        'molecules': molecules.map((item) => item.toJson()).toList(growable: false),
        'similarFragrances': similarFragrances.map((item) => item.toJson()).toList(growable: false),
        'scoreCards': scoreCards?.toJson(),
        'dataConfidence': trust.toJson(),
        'createdAt': createdAt,
        'inputText': inputText,
        'analysisMode': analysisMode,
      };
}

class WardrobeEntry {
  const WardrobeEntry({
    required this.analysisId,
    required this.name,
    required this.brand,
    required this.family,
    required this.addedAt,
  });

  final String analysisId;
  final String name;
  final String brand;
  final String family;
  final String addedAt;

  factory WardrobeEntry.fromJson(Map<String, dynamic> json) {
    return WardrobeEntry(
      analysisId: json['analysisId']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      brand: json['brand']?.toString() ?? '',
      family: json['family']?.toString() ?? '',
      addedAt: json['addedAt']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
        'analysisId': analysisId,
        'name': name,
        'brand': brand,
        'family': family,
        'addedAt': addedAt,
      };
}

import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;

import '../models/analysis_result.dart';

class ApiService {
  ApiService({
    http.Client? client,
    String? baseUrl,
  })  : _client = client ?? http.Client(),
        baseUrl = baseUrl ?? 'https://koku-dedektifi.vercel.app';

  final http.Client _client;
  final String baseUrl;

  Future<AnalysisResultModel> analyze({
    required String mode,
    required String input,
    bool isPro = false,
    Uint8List? imageBytes,
  }) async {
    final String normalizedMode = mode == 'image' ? 'image' : mode == 'notes' ? 'notes' : 'text';
    final Map<String, dynamic> payload = <String, dynamic>{
      'mode': normalizedMode,
      'input': normalizedMode == 'image' ? (input.isEmpty ? 'Fotoğraf analizi' : input) : input.trim(),
      'isPro': isPro,
    };

    if (normalizedMode == 'image' && imageBytes != null) {
      payload['imageBase64'] = base64Encode(imageBytes);
    }

    final Map<String, dynamic> data = await _postJson('/api/analyze', payload);
    final dynamic analysis = data['analysis'];
    if (analysis is! Map<String, dynamic>) {
      throw Exception('Analiz sonucu eksik.');
    }
    return AnalysisResultModel.fromJson(analysis);
  }

  Future<AnalysisVoteSummary> fetchVoteSummary(String analysisId) async {
    final Uri uri = Uri.parse('$baseUrl/api/perfume-vote?analysisId=$analysisId');
    final http.Response response = await _client.get(uri);
    final Map<String, dynamic> data = _decodeBody(response.body);
    if (response.statusCode >= 400) {
      throw Exception((data['error'] as String?) ?? 'Oylama özeti alınamadı.');
    }
    return AnalysisVoteSummary.fromJson(data);
  }

  Future<AnalysisVoteSummary> submitVote({
    required String analysisId,
    required String vote,
    bool allowUpdate = true,
  }) async {
    final Map<String, dynamic> data = await _postJson(
      '/api/perfume-vote',
      <String, dynamic>{
        'analysisId': analysisId,
        'vote': vote,
        'allowUpdate': allowUpdate,
      },
    );
    return AnalysisVoteSummary.fromJson(data);
  }

  Future<Map<String, dynamic>> _postJson(String path, Map<String, dynamic> payload) async {
    final Uri uri = Uri.parse('$baseUrl$path');
    final http.Response response = await _client.post(
      uri,
      headers: <String, String>{'Content-Type': 'application/json'},
      body: jsonEncode(payload),
    );

    final Map<String, dynamic> data = _decodeBody(response.body);
    if (response.statusCode >= 400) {
      throw Exception((data['error'] as String?) ?? 'İstek başarısız oldu (${response.statusCode}).');
    }
    return data;
  }

  Map<String, dynamic> _decodeBody(String body) {
    if (body.isEmpty) return <String, dynamic>{};
    final dynamic decoded = jsonDecode(body);
    if (decoded is Map<String, dynamic>) return decoded;
    return <String, dynamic>{'data': decoded};
  }
}

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

  Future<AnalysisResultModel> analyzeText(String text) async {
    final Map<String, dynamic> payload = <String, dynamic>{
      'promptType': 'analysis',
      'messages': <Map<String, dynamic>>[
        <String, dynamic>{
          'role': 'user',
          'content': text.trim(),
        },
      ],
    };

    final Map<String, dynamic> data = await _postJson('/api/proxy', payload);
    return AnalysisResultModel.fromJson(data);
  }

  Future<AnalysisResultModel> analyzeImage(Uint8List imageBytes) async {
    final String dataUrl = 'data:image/jpeg;base64,${base64Encode(imageBytes)}';
    final Map<String, dynamic> payload = <String, dynamic>{
      'promptType': 'analysis',
      'messages': <Map<String, dynamic>>[
        <String, dynamic>{
          'role': 'user',
          'content': <Map<String, dynamic>>[
            <String, dynamic>{
              'type': 'text',
              'text': 'Bu gorseldeki kokuyu analiz et.',
            },
            <String, dynamic>{
              'type': 'image_url',
              'image_url': <String, dynamic>{'url': dataUrl},
            },
          ],
        },
      ],
    };

    final Map<String, dynamic> data = await _postJson('/api/proxy', payload);
    return AnalysisResultModel.fromJson(data);
  }

  Future<BarcodeLookupResult> lookupBarcode(String code) async {
    final Map<String, dynamic> data = await _postJson(
      '/api/barcode-lookup',
      <String, dynamic>{'code': code},
    );
    return BarcodeLookupResult.fromJson(data);
  }

  Future<Map<String, dynamic>> _postJson(String path, Map<String, dynamic> payload) async {
    final Uri uri = Uri.parse('$baseUrl$path');
    final http.Response response = await _client.post(
      uri,
      headers: <String, String>{
        'Content-Type': 'application/json',
      },
      body: jsonEncode(payload),
    );

    final Map<String, dynamic> data = _decodeBody(response.body);
    if (response.statusCode >= 400) {
      throw Exception((data['error'] as String?) ?? 'Istek basarisiz oldu (${response.statusCode}).');
    }

    return data;
  }

  Map<String, dynamic> _decodeBody(String body) {
    if (body.isEmpty) {
      return <String, dynamic>{};
    }

    final dynamic decoded = jsonDecode(body);
    if (decoded is Map<String, dynamic>) {
      return decoded;
    }

    return <String, dynamic>{'data': decoded};
  }
}

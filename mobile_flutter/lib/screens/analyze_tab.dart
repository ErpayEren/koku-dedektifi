import 'dart:async';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../models/analysis_result.dart';
import '../services/api_service.dart';
import '../services/local_store_service.dart';
import '../widgets/analysis_detail_card.dart';
import '../widgets/common.dart';
import '../widgets/native_loading_card.dart';

class AnalyzeTab extends StatefulWidget {
  const AnalyzeTab({
    super.key,
    required this.api,
    required this.store,
    required this.initialResult,
    required this.onSaved,
    required this.onToggleWardrobe,
    required this.isInWardrobe,
  });

  final ApiService api;
  final LocalStoreService store;
  final AnalysisResultModel? initialResult;
  final Future<void> Function(AnalysisResultModel result) onSaved;
  final Future<void> Function(AnalysisResultModel result) onToggleWardrobe;
  final bool Function(String analysisId) isInWardrobe;

  @override
  State<AnalyzeTab> createState() => _AnalyzeTabState();
}

class _AnalyzeTabState extends State<AnalyzeTab> {
  final TextEditingController _controller = TextEditingController();
  final ImagePicker _picker = ImagePicker();

  Timer? _stageTimer;
  int _modeIndex = 0;
  bool _busy = false;
  String _stage = 'Veritabanı eşleşmeleri taranıyor…';
  String? _error;
  Uint8List? _imageBytes;
  AnalysisResultModel? _result;

  static const List<String> _stages = <String>[
    'Veritabanı eşleşmeleri taranıyor…',
    'Nota katmanları çözümleniyor…',
    'Moleküler yapı anlatısı kuruluyor…',
  ];

  @override
  void initState() {
    super.initState();
    _result = widget.initialResult;
  }

  @override
  void didUpdateWidget(covariant AnalyzeTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initialResult?.id != oldWidget.initialResult?.id &&
        widget.initialResult != null) {
      _result = widget.initialResult;
    }
  }

  @override
  void dispose() {
    _stageTimer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  String get _mode {
    switch (_modeIndex) {
      case 1:
        return 'notes';
      case 2:
        return 'image';
      default:
        return 'text';
    }
  }

  Future<void> _pickImage(ImageSource source) async {
    final XFile? file = await _picker.pickImage(
      source: source,
      imageQuality: 92,
      maxWidth: 1800,
    );
    if (file == null) return;
    final Uint8List bytes = await file.readAsBytes();
    if (!mounted) return;
    setState(() {
      _imageBytes = bytes;
      _error = null;
    });
  }

  Future<void> _runAnalysis() async {
    final String input = _controller.text.trim();
    if (_mode != 'image' && input.isEmpty) {
      setState(() {
        _error = 'Lütfen önce analiz edilecek metni veya notaları gir.';
      });
      return;
    }
    if (_mode == 'image' && _imageBytes == null) {
      setState(() {
        _error = 'Fotoğraf modu için önce bir görsel seç.';
      });
      return;
    }

    _stageTimer?.cancel();
    int stageIndex = 0;
    setState(() {
      _busy = true;
      _error = null;
      _stage = _stages.first;
    });

    _stageTimer = Timer.periodic(const Duration(milliseconds: 1100), (Timer timer) {
      stageIndex = (stageIndex + 1) % _stages.length;
      if (!mounted) return;
      setState(() {
        _stage = _stages[stageIndex];
      });
    });

    try {
      final AnalysisResultModel result = await widget.api.analyze(
        mode: _mode,
        input: input,
        isPro: true,
        imageBytes: _imageBytes,
      );
      await widget.onSaved(result);
      if (mounted) {
        setState(() {
          _result = result;
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _error = error.toString().replaceFirst('Exception: ', '');
        });
      }
    } finally {
      _stageTimer?.cancel();
      if (mounted) {
        setState(() {
          _busy = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bool hasImage = _imageBytes != null;

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          const SectionTitle(title: 'Native Core Analiz'),
          const SizedBox(height: 10),
          const Text(
            'Bir koku anlat, sırrını çözelim.',
            style: TextStyle(
              color: Color(0xFFEBE4D8),
              fontSize: 32,
              fontWeight: FontWeight.w800,
              height: 1.05,
            ),
          ),
          const SizedBox(height: 10),
          const Text(
            'Metin, nota listesi veya fotoğrafla başla. Native çekirdek doğrudan analiz API\'ine bağlanır.',
            style: TextStyle(color: Color(0xFFA29BAF), height: 1.45),
          ),
          const SizedBox(height: 18),
          SegmentedButton<int>(
            showSelectedIcon: false,
            segments: const <ButtonSegment<int>>[
              ButtonSegment<int>(
                value: 0,
                label: Text('Metin'),
                icon: Icon(Icons.edit_outlined),
              ),
              ButtonSegment<int>(
                value: 1,
                label: Text('Nota Listesi'),
                icon: Icon(Icons.format_list_bulleted),
              ),
              ButtonSegment<int>(
                value: 2,
                label: Text('Fotoğraf'),
                icon: Icon(Icons.photo_camera_outlined),
              ),
            ],
            selected: <int>{_modeIndex},
            onSelectionChanged: (Set<int> value) {
              setState(() {
                _modeIndex = value.first;
                _error = null;
              });
            },
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  if (_mode == 'image') ...<Widget>[
                    AspectRatio(
                      aspectRatio: 1.15,
                      child: Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: const Color(0xFFA78BFA),
                            width: 1.5,
                          ),
                          color: const Color(0xFF110F15),
                          image: hasImage
                              ? DecorationImage(
                                  image: MemoryImage(_imageBytes!),
                                  fit: BoxFit.cover,
                                )
                              : null,
                        ),
                        child: hasImage
                            ? null
                            : const Center(
                                child: Text(
                                  'Fotoğraf seçildiğinde burada görünecek',
                                  style: TextStyle(color: Color(0xFFA29BAF)),
                                  textAlign: TextAlign.center,
                                ),
                              ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: <Widget>[
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: _busy ? null : () => _pickImage(ImageSource.camera),
                            icon: const Icon(Icons.photo_camera_outlined),
                            label: const Text('Kamera'),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: _busy ? null : () => _pickImage(ImageSource.gallery),
                            icon: const Icon(Icons.photo_library_outlined),
                            label: const Text('Galeri'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                  ],
                  TextField(
                    controller: _controller,
                    enabled: !_busy,
                    minLines: _mode == 'notes' ? 4 : 1,
                    maxLines: _mode == 'notes' ? 6 : 1,
                    textInputAction: TextInputAction.done,
                    onSubmitted: (_) => _runAnalysis(),
                    decoration: InputDecoration(
                      hintText: _mode == 'notes'
                          ? 'Örn: bergamot, ananas, paçuli, amber'
                          : _mode == 'image'
                              ? 'Fotoğraf için kısa not bırakabilirsin'
                              : 'Örn: Creed Aventus veya odunsu ama ferah',
                      filled: true,
                      fillColor: Colors.white.withValues(alpha: 0.04),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(18),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                  if (_error != null) ...<Widget>[
                    const SizedBox(height: 12),
                    Text(
                      _error!,
                      style: const TextStyle(color: Color(0xFFFF9A9A)),
                    ),
                  ],
                  const SizedBox(height: 14),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: _busy ? null : _runAnalysis,
                      icon: Icon(_busy ? Icons.hourglass_top : Icons.auto_awesome),
                      label: Text(_busy ? 'Analiz sürüyor…' : 'Analizi Başlat'),
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFFC9A96E),
                        foregroundColor: const Color(0xFF09080A),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 18),
          if (_busy) NativeLoadingCard(stage: _stage),
          if (!_busy && _result != null)
            AnalysisDetailCard(
              result: _result!,
              api: widget.api,
              store: widget.store,
              inWardrobe: widget.isInWardrobe(_result!.id),
              onToggleWardrobe: () => widget.onToggleWardrobe(_result!),
            ),
          if (!_busy && _result == null)
            const EmptyStateCard(
              icon: Icons.auto_awesome_outlined,
              title: 'İlk analiz hazır',
              body: 'Native uygulama çekirdeği aktif. Bir parfüm adı, nota listesi veya fotoğraf vererek analizi başlatabilirsin.',
            ),
        ],
      ),
    );
  }
}

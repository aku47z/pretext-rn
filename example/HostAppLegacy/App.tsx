import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  NativeModules,
  PixelRatio,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  configureMeasure,
  measureHeight,
  measureHeightInput,
  type MeasureTextStyle,
} from 'pretext-rn';

configureMeasure({
  fallbackPolicy: 'throw',
  roundToPixel: true,
});

type CaseDefinition = {
  id: string;
  text: string;
  width: number;
  measureWidth?: number;
  style: MeasureTextStyle;
  maxLines?: number;
};

type CaseResult = {
  id: string;
  measured?: number;
  error?: string;
};

type ParityRow = {
  id: string;
  measured?: number;
  measuredWidth: number;
  rendered?: number;
  absDelta?: number;
  absDeltaPx?: number;
  error?: string;
};

function toPixelHeight(height: number, pixelRatio: number): number {
  return Math.round(height * pixelRatio);
}

function buildSweepCases(activeFontScale: number): readonly CaseDefinition[] {
  const latinText =
    'Broad parity experiment across text styles and scripts for rendering alignment.';
  const lineHeightText = 'Height probe';
  const widthNarrowText =
    'Narrow width parity sample for deterministic wrapping.';
  const longText =
    'This paragraph intentionally overflows two lines so maxLines clipping parity can be asserted between measured and rendered output.';
  // Keep this case large (~10k chars) but include break opportunities so layout is stable cross-platform.
  const longText10k = 'A '.repeat(5000).trim();
  const customFontLatinText = 'Glyph';
  const customFontArabicText = 'مرحبا';
  const customFontDevanagariText = 'नमस्ते';
  const customFontThaiText = 'สวัสดี';
  const baseScaleStyle = {
    fontSize: 14,
    lineHeight: 22,
  };

  return [
    {
      id: 'latin-regular',
      text: latinText,
      width: 220,
      style: {fontSize: 15, lineHeight: 24},
    },
    {
      id: 'latin-bold',
      text: latinText,
      width: 200,
      style: {fontSize: 15, fontWeight: '700', lineHeight: 24},
    },
    {
      id: 'latin-italic',
      text: latinText,
      width: 240,
      style: {fontSize: 15, fontStyle: 'italic', lineHeight: 24},
    },
    {
      id: 'latin-monospace',
      text: 'Monospace sample to validate glyph metrics and wrapping behavior consistency.',
      width: 220,
      style: {fontSize: 15, fontFamily: 'monospace', lineHeight: 24},
    },
    {
      id: 'line-height-normal',
      text: lineHeightText,
      width: 220,
      style: {fontSize: 15, includeFontPadding: false},
    },
    {
      id: 'line-height-tight',
      text: lineHeightText,
      width: 220,
      style: {fontSize: 15, lineHeight: 15, includeFontPadding: false},
    },
    {
      id: 'line-height-loose',
      text: lineHeightText,
      width: 220,
      style: {fontSize: 15, lineHeight: 27, includeFontPadding: false},
    },
    {
      id: 'width-narrow-100',
      text: widthNarrowText,
      width: 100,
      style: {fontSize: 14, lineHeight: 22, includeFontPadding: false},
    },
    {
      id: 'width-medium-240',
      text: latinText,
      width: 240,
      style: {fontSize: 14, lineHeight: 22},
    },
    {
      id: 'width-wide-360',
      text: latinText,
      width: 360,
      style: {fontSize: 14, lineHeight: 22},
    },
    {
      id: 'max-lines-1',
      text: longText,
      width: 180,
      maxLines: 1,
      style: {fontSize: 15, lineHeight: 24},
    },
    {
      id: 'max-lines-2',
      text: longText,
      width: 180,
      maxLines: 2,
      style: {fontSize: 15, lineHeight: 24},
    },
    {
      id: 'max-lines-3',
      text: longText,
      width: 180,
      maxLines: 3,
      style: {fontSize: 15, lineHeight: 24},
    },
    {
      id: 'emoji-single',
      text: '😀',
      width: 220,
      style: {fontSize: 16, lineHeight: 24},
    },
    {
      id: 'emoji-zwj-family',
      text: '👨‍👩‍👧‍👦',
      width: 220,
      style: {fontSize: 16, lineHeight: 24},
    },
    {
      id: 'emoji-flag-sequence',
      text: '🇯🇵 🇺🇸 🇮🇳',
      width: 220,
      style: {fontSize: 16, lineHeight: 24},
    },
    {
      id: 'cjk-text',
      text: '中文排版测量用于验证多字节脚本在不同宽度下的高度一致性。',
      width: 220,
      style: {fontSize: 16, lineHeight: 24},
    },
    {
      id: 'arabic-text',
      text: 'قياس النص العربي للتحقق من اتساق الارتفاع مع اتجاهات الكتابة المختلفة.',
      width: 220,
      style: {fontSize: 16, lineHeight: 24},
    },
    {
      id: 'hindi-devanagari',
      text: 'देवनागरी पाठ मापन से अलग लिपि में ऊंचाई की स्थिरता की जांच होती है।',
      width: 220,
      style: {fontSize: 16, lineHeight: 24},
    },
    {
      id: 'mixed-script',
      text: 'Latin + 中文 + 😀 + हिंदी mixed in one measured sentence.',
      width: 220,
      style: {fontSize: 16, lineHeight: 24},
    },
    {
      id: 'custom-font-inter-regular',
      text: customFontLatinText,
      width: 220,
      style: {
        fontFamily: 'Inter_24pt-Regular',
        fontSize: 16,
        lineHeight: 24,
      },
    },
    {
      id: 'custom-font-jetbrainsmono-regular',
      text: customFontLatinText,
      width: 220,
      style: {
        fontFamily: 'JetBrainsMono-Regular',
        fontSize: 16,
        lineHeight: 24,
      },
    },
    {
      id: 'custom-font-charmonman-regular',
      text: customFontThaiText,
      width: 220,
      style: {
        fontFamily: 'Charmonman-Regular',
        fontSize: 16,
        lineHeight: 24,
      },
    },
    {
      id: 'custom-font-notosans-latin',
      text: customFontLatinText,
      width: 220,
      style: {
        fontFamily: 'NotoSans-Regular',
        fontSize: 16,
        lineHeight: 24,
      },
    },
    {
      id: 'custom-font-notosans-arabic',
      text: customFontArabicText,
      width: 220,
      style: {
        fontFamily: 'NotoSans-Regular',
        fontSize: 16,
        lineHeight: 24,
      },
    },
    {
      id: 'custom-font-notosans-devanagari',
      text: customFontDevanagariText,
      width: 220,
      style: {
        fontFamily: 'NotoSans-Regular',
        fontSize: 16,
        lineHeight: 24,
      },
    },
    {
      id: 'custom-font-notosans-condensed',
      text: customFontLatinText,
      width: 220,
      style: {
        fontFamily: 'NotoSans_Condensed-Regular',
        fontSize: 16,
        lineHeight: 24,
      },
    },
    {
      id: 'custom-font-notosans-semicondensed',
      text: customFontLatinText,
      width: 220,
      style: {
        fontFamily: 'NotoSans_SemiCondensed-Regular',
        fontSize: 16,
        lineHeight: 24,
      },
    },
    {
      id: 'font-scale-1x',
      text: 'Font-scale parity probe for explicit 1.0 scale simulation.',
      width: 220,
      style: {
        fontSize: baseScaleStyle.fontSize,
        lineHeight: baseScaleStyle.lineHeight,
      },
    },
    {
      id: 'font-scale-1-5x',
      text: 'Font-scale parity probe for explicit 1.5 scale simulation.',
      width: 220,
      style: {
        fontSize: baseScaleStyle.fontSize * 1.5,
        lineHeight: baseScaleStyle.lineHeight * 1.5,
      },
    },
    {
      id: 'font-scale-2x',
      text: 'Font-scale parity probe for explicit 2.0 scale simulation.',
      width: 200,
      style: {
        fontSize: baseScaleStyle.fontSize * 2,
        lineHeight: baseScaleStyle.lineHeight * 2,
      },
    },
    {
      id: 'font-scale-active-runtime',
      text: 'Font-scale parity probe for active platform scale.',
      width: 220,
      style: {
        fontSize: 14 * activeFontScale,
        lineHeight: 22 * activeFontScale,
      },
    },
    {
      id: 'empty-string',
      text: '',
      width: 220,
      style: {fontSize: 16, lineHeight: 24},
    },
    {
      id: 'long-string-10k',
      text: longText10k,
      width: 220,
      maxLines: 3,
      style: {fontSize: 14, lineHeight: 20},
    },
    {
      id: 'zero-width-normalized',
      text: 'A',
      // Render at a normal width for UI readability, but still measure with width=0.
      width: 220,
      measureWidth: 0,
      style: {fontSize: 14, lineHeight: 20, includeFontPadding: false},
    },
  ];
}

function App(): React.JSX.Element {
  const activeFontScale = PixelRatio.getFontScale();
  const devicePixelRatio = PixelRatio.get();
  const cases = useMemo<readonly CaseDefinition[]>(
    () => buildSweepCases(activeFontScale),
    [activeFontScale],
  );

  const [renderedHeights, setRenderedHeights] = useState<
    Record<string, number>
  >({});
  const [installResult, setInstallResult] = useState<string>('pending');
  const [installAttempted, setInstallAttempted] = useState<boolean>(false);
  const [parityFilePath, setParityFilePath] = useState<string>('n/a');
  const loggedDigest = useRef<string>('');

  useEffect(() => {
    const reactNativeModule = require('react-native') as {
      TurboModuleRegistry?: {
        get?: <T>(name: string) => T | null;
      };
      NativeModules?: {
        PretextMeasure?: {
          installJSI?: () => unknown;
          installJSIAsync?: () => Promise<unknown>;
        };
      };
    };

    const turboGet = reactNativeModule.TurboModuleRegistry?.get;

    const moduleRef =
      turboGet?.<{
        installJSI?: () => unknown;
        installJSIAsync?: () => Promise<unknown>;
      }>('NativePretext') ??
      turboGet?.<{
        installJSI?: () => unknown;
        installJSIAsync?: () => Promise<unknown>;
      }>('PretextMeasure') ??
      reactNativeModule.NativeModules?.PretextMeasure ??
      (NativeModules.PretextMeasure as
        | {installJSI?: () => unknown; installJSIAsync?: () => Promise<unknown>}
        | undefined);

    const attemptInstall = async () => {
      let result = 'n/a';
      try {
        if (moduleRef?.installJSI) {
          result = String(moduleRef.installJSI());
        } else if (moduleRef?.installJSIAsync) {
          result = String(await moduleRef.installJSIAsync());
        }
      } catch (error) {
        result = error instanceof Error ? error.message : String(error);
      }

      setInstallResult(result);
      setInstallAttempted(true);
    };

    const timer = setTimeout(() => {
      attemptInstall();
    }, 2500);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  const measured = useMemo<readonly CaseResult[]>(() => {
    if (!installAttempted) {
      return cases.map(entry => ({
        id: entry.id,
        error: 'install pending',
      }));
    }

    return cases.map(entry => {
      const measureWidth = entry.measureWidth ?? entry.width;
      try {
        const value =
          entry.maxLines == null
            ? measureHeight(entry.text, entry.style, measureWidth)
            : measureHeightInput({
                text: entry.text,
                style: entry.style,
                width: measureWidth,
                maxLines: entry.maxLines,
              });
        return {id: entry.id, measured: value};
      } catch (error) {
        return {
          id: entry.id,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });
  }, [cases, installAttempted]);

  const measuredMap = useMemo(() => {
    const map: Record<string, CaseResult> = {};
    measured.forEach(entry => {
      map[entry.id] = entry;
    });
    return map;
  }, [measured]);

  const parityRows = useMemo<readonly ParityRow[]>(() => {
    return cases.map(entry => {
      const result = measuredMap[entry.id];
      const rendered = renderedHeights[entry.id];
      const measuredValue = result?.measured;
      const measureWidth = entry.measureWidth ?? entry.width;

      const row: ParityRow = {
        id: entry.id,
        measured: measuredValue,
        measuredWidth: measureWidth,
        rendered,
      };

      if (result?.error) {
        row.error = result.error;
        return row;
      }

      if (typeof measuredValue === 'number' && typeof rendered === 'number') {
        row.absDelta = Math.abs(measuredValue - rendered);
        row.absDeltaPx = Math.abs(
          toPixelHeight(measuredValue, devicePixelRatio) -
            toPixelHeight(rendered, devicePixelRatio),
        );
      }

      return row;
    });
  }, [cases, measuredMap, renderedHeights, devicePixelRatio]);

  useEffect(() => {
    const payload = JSON.stringify(parityRows);
    if (payload === loggedDigest.current) {
      return;
    }
    loggedDigest.current = payload;

    parityRows.forEach(row => {
      console.log('[pretext-rn legacy] parity-row-json', JSON.stringify(row));
    });

    console.log('[pretext-rn legacy] parity-json', payload);
    console.log('[pretext-rn legacy] parity-final-json', payload);

    const store = NativeModules.PretextParityStore as
      | {
          writeParityRows?: (rows: string) => Promise<string>;
        }
      | undefined;

    if (!store?.writeParityRows) {
      const message = 'bridge-unavailable';
      setParityFilePath(message);
      console.log('[pretext-rn legacy] parity-file-write', message);
    } else {
      store
        .writeParityRows(payload)
        .then(path => {
          if (typeof path === 'string') {
            setParityFilePath(path);
            console.log('[pretext-rn legacy] parity-file-write', path);
          }
        })
        .catch(error => {
          const reason = error instanceof Error ? error.message : String(error);
          const message = `write-failed: ${reason}`;
          setParityFilePath(message);
          console.log('[pretext-rn legacy] parity-file-write', message);
        });
    }
  }, [parityRows]);

  const allZero = parityRows.every(row => (row.absDeltaPx ?? 0) === 0);
  const parityMap = useMemo(() => {
    const map: Record<string, ParityRow> = {};
    parityRows.forEach(row => {
      map[row.id] = row;
    });
    return map;
  }, [parityRows]);

  const formatMetric = (value: number | undefined): string => {
    return typeof value === 'number' ? value.toFixed(3) : '-';
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>
          pretext-rn HostAppLegacy parity harness
        </Text>
        <Text style={styles.meta}>installJSI result: {installResult}</Text>
        <Text style={styles.meta}>sweep cases: {cases.length}</Text>
        <Text style={styles.meta}>
          all-zero status: {allZero ? 'yes' : 'no'}
        </Text>
        <Text style={styles.meta}>
          {Platform.OS} parity file: {parityFilePath}
        </Text>

        {cases.map(entry => {
          const row = parityMap[entry.id];

          return (
            <View
              key={entry.id}
              style={[styles.caseContainer, {width: entry.width}]}>
              <Text
                onLayout={event => {
                  const height = event.nativeEvent.layout.height;
                  setRenderedHeights(current => {
                    if (current[entry.id] === height) {
                      return current;
                    }
                    return {...current, [entry.id]: height};
                  });
                }}
                numberOfLines={entry.maxLines}
                style={entry.style as never}>
                {entry.text}
              </Text>
              <Text style={styles.caseMetrics}>
                rendered: {formatMetric(row?.rendered)}
              </Text>
              <Text style={styles.caseMetrics}>
                calculated: {formatMetric(row?.measured)}
              </Text>
              <Text style={styles.caseMetrics}>
                absDelta: {formatMetric(row?.absDelta)}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 18,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    color: '#0f172a',
  },
  meta: {
    fontSize: 12,
    color: '#334155',
  },
  caseContainer: {
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  caseMetrics: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
});

export default App;

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, Users, CheckCircle, XCircle, Copy, Loader2, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';
// import { getEmbeddings, cosineSim, topKCandidates, CandidateMatch } from '../../utils/embeddings';
// import { computeChecksum, loadCachedEmbeddings, saveCachedEmbeddings } from '../../utils/cache';
import { adjudicateWithGemini } from '../../utils/ai_match';

// TypeScript Interfaces
interface MenteeData {
  nama: string;
  program: string;
  mentor: string;
}

interface ZoomParticipant {
  nama: string;
  email: string;
  durasi: number;
  tamu: string;
}

interface AttendanceResult {
  mentee: MenteeData;
  durasi: number;
  status: 0 | 1;
  matchedName?: string;
  matchMeta?: {
    source: "semantic" | "ai" | "rule" | "none";
    score?: number;
    confidence?: number;
  };
}

interface UploadCardProps {
  onFileUpload: (file: File) => void;
  isProcessing: boolean;
  loadingMessage: string;
  progress: number;
}

interface ErrorAlertProps {
  error: string;
  onDismiss: () => void;
}

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  delay?: number;
}

interface AttendanceTableProps {
  results: AttendanceResult[];
  onCopyBinary: () => void;
}



const UploadCard: React.FC<UploadCardProps> = ({ onFileUpload, isProcessing, loadingMessage, progress }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      onFileUpload(file);
    } else {
      alert('Please select a valid CSV file');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-8 border border-gray-700 hover:border-teal-400 transition-all duration-300"
    >
      <div className="text-center">
        <div className="p-4 bg-teal-500 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          {isProcessing ? (
            <Loader2 size={32} className="text-white animate-spin" />
          ) : (
            <Upload size={32} className="text-white" />
          )}
        </div>
        <h3 className="text-xl font-semibold text-gray-100 mb-2">Upload File CSV Zoom</h3>
        <p className="text-gray-400 mb-6">Upload file participants dari Zoom untuk memproses absensi</p>

        {isProcessing && (
          <div className="mb-6">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Loader2 size={16} className="animate-spin text-teal-400" />
              <span className="text-teal-400 font-medium">Processing...</span>
            </div>
            <p className="text-sm text-gray-400 mb-3">{loadingMessage}</p>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-teal-500 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(progress, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{Math.round(progress)}%</p>
          </div>
        )}

        <label className="relative cursor-pointer">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            disabled={isProcessing}
          />
          <motion.div
            whileHover={!isProcessing ? { scale: 0.99 } : {}}
            whileTap={!isProcessing ? { scale: 0.95 } : {}}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${isProcessing
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-teal-500 text-white hover:bg-teal-600'
              }`}
          >
            {isProcessing ? 'Processing...' : 'Pilih File CSV'}
          </motion.div>
        </label>
      </div>
    </motion.div>
  );
};

const ErrorAlert: React.FC<ErrorAlertProps> = ({ error, onDismiss }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-red-900/50 border border-red-500 rounded-xl p-4 mb-6"
    >
      <div className="flex items-start space-x-3">
        <AlertCircle size={20} className="text-red-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="text-red-400 font-medium mb-1">Error Processing File</h4>
          <pre className="text-red-300 text-sm whitespace-pre-wrap font-mono bg-red-900/30 p-2 rounded">{error}</pre>
        </div>
        <button
          onClick={onDismiss}
          className="text-red-400 hover:text-red-300 transition-colors"
        >
          <XCircle size={18} />
        </button>
      </div>
    </motion.div>
  );
};

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm mb-1">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color.includes('green') ? 'bg-green-500/20' : color.includes('red') ? 'bg-red-500/20' : 'bg-teal-500/20'}`}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
};

const AttendanceTable: React.FC<AttendanceTableProps> = ({ results, onCopyBinary }) => {
  if (results.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-gray-700 overflow-hidden"
    >
      <div className="p-6 border-b border-gray-700 flex justify-between items-center">
        <h3 className="text-xl font-semibold text-gray-100">Hasil Absensi</h3>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onCopyBinary}
          className="flex items-center space-x-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
        >
          <Copy size={16} />
          <span>Copy Binary</span>
        </motion.button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Nama</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Program</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Mentor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Durasi (menit)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Match Source</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Binary</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {results.map((result, index) => (
              <motion.tr
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="hover:bg-gray-700/30 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">
                  {result.mentee.nama}
                  {result.matchedName && result.matchedName !== result.mentee.nama && (
                    <div className="text-xs text-gray-400 mt-1">Matched: {result.matchedName}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{result.mentee.program}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{result.mentee.mentor}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{result.durasi}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {result.status === 1 ? (
                      <CheckCircle size={16} className="text-green-400" />
                    ) : (
                      <XCircle size={16} className="text-red-400" />
                    )}
                    <span className={`text-sm font-medium ${result.status === 1 ? 'text-green-400' : 'text-red-400'
                      }`}>
                      {result.status === 1 ? 'Hadir' : 'Alpha'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400">
                  {(() => {
                    const meta = result.matchMeta; // type: {source: ...; score?: number; confidence?: number} | undefined
                    const score: number | undefined = meta?.score;
                    const conf: number | undefined = meta?.confidence;

                    return (
                      <>
                        {meta?.source ?? 'none'}
                        {typeof score === 'number' ? <div>Score: {score.toFixed(2)}</div> : null}
                        {typeof conf === 'number' ? <div>Conf: {conf.toFixed(2)}</div> : null}
                      </>
                    );
                  })()}
                </td>


              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

// Utility functions untuk name matching
const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
};

const extractNameVariations = (fullName: string): string[] => {
  const variations: string[] = [];
  const normalized = normalizeString(fullName);

  // Add original normalized name
  variations.push(normalized);

  // Only add separated parts if the name itself is a single word
  const parts = fullName.split(/[_\-\s]+/).filter(part => part.length > 0);
  if (parts.length === 1) {
    const normalizedPart = normalizeString(parts[0]);
    if (normalizedPart.length > 2) {
      variations.push(normalizedPart);
    }
  }

  // Extract name before program mention
  const beforeProgram = fullName.split(/_(web|ai|artificial)/i)[0];
  if (beforeProgram !== fullName) {
    variations.push(normalizeString(beforeProgram));
  }

  // Extract name from parentheses (possible nickname)
  const parenthesesMatch = fullName.match(/\(([^)]+)\)/);
  if (parenthesesMatch) {
    const nickname = normalizeString(parenthesesMatch[1]);
    if (nickname.length > 2) {
      variations.push(nickname);
    }
  }

  return [...new Set(variations)]; // Remove duplicates
};

const calculateNameSimilarity = (name1: string, name2: string): number => {
  const norm1 = normalizeString(name1);
  const norm2 = normalizeString(name2);

  // Exact match
  if (norm1 === norm2) return 1.0;

  // Check if one contains the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return 0.8;
  }

  // Split into words and check word matches
  const words1 = norm1.split(' ').filter(w => w.length > 2);
  const words2 = norm2.split(' ').filter(w => w.length > 2);

  if (words1.length === 0 || words2.length === 0) return 0;

  let matchingWords = 0;
  words1.forEach(word1 => {
    words2.forEach(word2 => {
      if (word1 === word2 || word1.includes(word2) || word2.includes(word1)) {
        matchingWords++;
      }
    });
  });

  return matchingWords / Math.max(words1.length, words2.length);
};

interface NameMatch {
  name: string;
  score: number;
}

// =================================================================
// KODE YANG DIPERBAIKI ADA DI FUNGSI DI BAWAH INI
// =================================================================
const findBestMatch = (zoomName: string, menteeNames: string[]): NameMatch | null => {
  if (menteeNames.length === 0) {
    return null;
  }

  const zoomVariations = extractNameVariations(zoomName);
  let bestMatch: NameMatch | null = null;

  for (const menteeName of menteeNames) {
    const menteeVariations = extractNameVariations(menteeName);

    for (const zoomVar of zoomVariations) {
      for (const menteeVar of menteeVariations) {
        const score = calculateNameSimilarity(zoomVar, menteeVar);

        if (bestMatch === null || score > bestMatch.score) {
          bestMatch = { name: menteeName, score };
        }
      }
    }
  }

  return bestMatch;
};

export const Absensi: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [attendanceResults, setAttendanceResults] = useState<AttendanceResult[]>([]);
  const [stats, setStats] = useState<{ total: number; hadir: number; alpha: number }>({ total: 0, hadir: 0, alpha: 0 });

  // Load mentee data from CSV
  const loadMenteeData = useCallback(async (): Promise<MenteeData[]> => {
    try {
      setLoadingMessage('Memuat data mentee...');
      setProgress(5);

      const response = await fetch('/src/utils/DataMentee.csv');
      if (!response.ok) {
        throw new Error(`Failed to fetch mentee data: ${response.status} ${response.statusText}`);
      }
      const csvText = await response.text();

      return new Promise<MenteeData[]>((resolve, reject) => {
        Papa.parse<MenteeData>(csvText, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header: string): string => {
            const headerMap: Record<string, string> = {
              'Nama': 'nama',
              'Program': 'program',
              'Mentor': 'mentor'
            };
            return headerMap[header] || header.toLowerCase();
          },
          complete: (results) => {
            if (results.errors.length > 0) {
              const errorMessages = results.errors.map(e => `Line ${e.row}: ${e.message}`).join('\n');
              reject(new Error(`CSV parsing errors:\n${errorMessages}`));
            } else {
              setProgress(10);
              resolve(results.data);
            }
          },
          error: (error: Error) => {
            reject(new Error(`CSV parsing failed: ${error.message || 'Unknown parsing error'}`));
          }
        });
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error loading mentee data';
      console.error('Error loading mentee data:', error);
      throw new Error(errorMessage);
    }
  }, []);


  // Enhanced CSV processing with improved name matching
  const handleFileUpload = useCallback(async (file: File): Promise<void> => {
    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setLoadingMessage('Memulai proses...');

    try {
      const menteeData = await loadMenteeData();
      setLoadingMessage(`Berhasil memuat ${menteeData.length} data mentee. Memproses file CSV...`);
      setProgress(15);

      const zoomData = await new Promise<ZoomParticipant[]>((resolve, reject) => {
        Papa.parse<ZoomParticipant>(file, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header: string): string => {
            const headerMap: Record<string, string> = {
              'Nama (nama asli)': 'nama',
              'Email': 'email',
              'Total durasi (menit)s': 'durasi',
              'Tamu': 'tamu'
            };
            return headerMap[header] || header.toLowerCase();
          },
          complete: (results) => {
            if (results.errors.length > 0) {
              const errorMessages = results.errors.map(e => `Line ${e.row}: ${e.message}`).join('\n');
              reject(new Error(`CSV parsing errors:\n${errorMessages}`));
            } else {
              resolve(results.data);
            }
          },
          error: (parseError) => {
            reject(new Error(`CSV parsing failed: ${parseError.message || 'Unknown parsing error'}`));
          }
        });
      });

      setLoadingMessage(`Berhasil memproses ${zoomData.length} data peserta Zoom. Mencocokkan nama...`);
      setProgress(25);

      const attendanceResults: AttendanceResult[] = [];
      const zoomNameToParticipant = new Map<string, ZoomParticipant>();

      zoomData.forEach(participant => {
        zoomNameToParticipant.set(participant.nama, participant);
      });

      setLoadingMessage('Melakukan pencocokan nama dengan AI...');
      setProgress(30);

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Google Gemini API key not found in environment variables (VITE_GEMINI_API_KEY)');
      }

      const matchedZoomNames = new Set<string>();

      for (const [index, mentee] of menteeData.entries()) {
        const progressPercent = 30 + ((index / menteeData.length) * 40);
        setProgress(progressPercent);

        let matchedParticipant: ZoomParticipant | null = null;
        let matchedZoomName: string | null = null;
        let matchMeta: AttendanceResult['matchMeta'] = { source: 'none' };

        const candidate = findBestMatch(
          mentee.nama,
          Array.from(zoomNameToParticipant.keys()).filter(name => !matchedZoomNames.has(name))
        );

        if (candidate && candidate.score >= 0.2) {
          try {
            const aiResult = await adjudicateWithGemini(apiKey, candidate.name, [mentee.nama]);
            if (aiResult.bestMatch) {
              matchedParticipant = zoomNameToParticipant.get(candidate.name) || null;
              matchedZoomName = candidate.name;
              matchedZoomNames.add(candidate.name);
              matchMeta = { source: 'ai', score: candidate.score, confidence: aiResult.confidence };
            }
          } catch (aiErr) {
            console.warn('AI adjudication failed:', aiErr);
          }
        }

        const durasi = matchedParticipant?.durasi || 0;
        const status: 0 | 1 = durasi >= 30 ? 1 : 0;

        attendanceResults.push({
          mentee,
          durasi,
          status,
          matchedName: matchedZoomName && matchedZoomName !== mentee.nama ? matchedZoomName : undefined,
          matchMeta
        });
      }

      setProgress(80);

      setLoadingMessage('Menghitung statistik...');
      setProgress(90);

      const total = attendanceResults.length;
      const hadir = attendanceResults.filter(r => r.status === 1).length;
      const alpha = total - hadir;

      setAttendanceResults(attendanceResults);
      setStats({ total, hadir, alpha });
      setLoadingMessage('Selesai!');
      setProgress(100);

      setTimeout(() => {
        setLoadingMessage('');
        setProgress(0);
      }, 1500);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const fullError = `File Processing Error: ${errorMessage}\n\nStack trace:\n${error instanceof Error ? error.stack || 'No stack trace available' : 'No stack trace available'}`;
      console.error('Error processing file:', error);
      setError(fullError);
    } finally {
      setIsProcessing(false);
    }
  }, [loadMenteeData]);

  // Copy binary results to clipboard
  const handleCopyBinary = useCallback((): void => {
    try {
      const binaryString = attendanceResults.map(result => result.status).join('\n');
      navigator.clipboard.writeText(binaryString).then(() => {
        alert('Binary data copied to clipboard!');
      }).catch((clipboardError) => {
        console.error('Clipboard error:', clipboardError);
        setError(`Clipboard Error: ${clipboardError instanceof Error ? clipboardError.message : 'Unknown clipboard error'}`);
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error copying binary data';
      console.error('Error copying binary data:', error);
      setError(`Copy Error: ${errorMessage}`);
    }
  }, [attendanceResults]);

  const handleDismissError = useCallback((): void => {
    setError(null);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" style={{ backgroundColor: '#222831' }}>
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-gray-800/80 backdrop-blur-sm border-b border-gray-700"
        style={{ backgroundColor: '#31363F' }}
      >
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center space-x-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center text-white font-bold text-xl"
              style={{ backgroundColor: '#76ABAE' }}
            >
              📋
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-gray-100">Sistem Absensi</h1>
              <p className="text-gray-400">KMM B9 Infinite Learning</p>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-8"
        >
          <h2 className="text-3xl font-bold text-gray-100 mb-2">Upload & Proses Absensi</h2>
          <p className="text-gray-400">Upload file CSV dari Zoom untuk memproses data kehadiran mentee</p>
        </motion.div>

        {/* Error Alert */}
        {error && (
          <ErrorAlert error={error} onDismiss={handleDismissError} />
        )}

        {/* Upload Section */}
        <div className="mb-8">
          <UploadCard
            onFileUpload={handleFileUpload}
            isProcessing={isProcessing}
            loadingMessage={loadingMessage}
            progress={progress}
          />
        </div>

        {/* Stats Section */}
        {attendanceResults.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatsCard
              title="Total Mentee"
              value={stats.total}
              icon={<Users size={24} className="text-teal-400" />}
              color="text-teal-400"
              delay={0.4}
            />
            <StatsCard
              title="Hadir"
              value={stats.hadir}
              icon={<CheckCircle size={24} className="text-green-400" />}
              color="text-green-400"
              delay={0.5}
            />
            <StatsCard
              title="Alpha"
              value={stats.alpha}
              icon={<XCircle size={24} className="text-red-400" />}
              color="text-red-400"
              delay={0.6}
            />
          </div>
        )}

        {/* Results Table */}
        <AttendanceTable results={attendanceResults} onCopyBinary={handleCopyBinary} />
      </main>
    </div>
  );
};
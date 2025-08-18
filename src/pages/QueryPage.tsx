import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  MicrophoneIcon,
  PaperAirplaneIcon,
  PhotoIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from '@/lib/i18n';
import { analytics } from '@/lib/analytics';
import { apiClient, QueryResponse, UploadResponse } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const QueryPage = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadedImage, setUploadedImage] = useState<UploadResponse | null>(null);
  const { t, language } = useTranslation();
  const { toast } = useToast();

  // Get query from URL params if present
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlQuery = urlParams.get('q');
    if (urlQuery) {
      setQuery(decodeURIComponent(urlQuery));
    }
  }, []);

  const handleSubmit = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    analytics.querySubmitted('text');

    try {
      let imageId: string | undefined = undefined;
      
      // If there's an image, upload it first
      if (imageFile) {
        try {
          const uploadResult = await apiClient.uploadImage(imageFile);
          setUploadedImage(uploadResult);
          imageId = uploadResult.image_id;
          
          toast({
            title: "Image uploaded successfully",
            description: `Detected: ${uploadResult.label} (${Math.round(uploadResult.confidence * 100)}% confidence)`,
          });
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          toast({
            title: "Image upload failed",
            description: "Proceeding with text query only",
            variant: "destructive",
          });
        }
      }

      // Submit query
      const queryResult = await apiClient.query({
        text: query,
        lang: language,
        image_id: imageId,
      });

      setResponse(queryResult);
      analytics.track('query_completed', { 
        confidence: queryResult.confidence,
        has_image: !!imageId 
      });

      toast({
        title: "Query completed",
        description: `Confidence: ${Math.round(queryResult.confidence * 100)}%`,
      });
    } catch (error) {
      console.error('Query failed:', error);
      analytics.errorOccurred('query_failed', 'QueryPage');
      
      toast({
        title: "Query failed",
        description: error instanceof Error ? error.message : "Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Voice not supported",
        description: "Your browser doesn't support voice input.",
        variant: "destructive",
      });
      return;
    }

    setIsListening(true);
    analytics.featureUsed('voice_input');

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = language === 'hi' ? 'hi-IN' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
      toast({
        title: "Voice recognition failed",
        description: "Please try speaking again or type your question.",
        variant: "destructive",
      });
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File too large",
          description: "Please select an image smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }
      setImageFile(file);
      analytics.featureUsed('image_upload');
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-success';
    if (confidence >= 0.6) return 'text-warning';
    return 'text-destructive';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return CheckCircleIcon;
    if (confidence >= 0.6) return ExclamationTriangleIcon;
    return ExclamationTriangleIcon;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2 text-foreground flex items-center justify-center gap-2">
            <SparklesIcon className="w-8 h-8 text-primary" />
            {t('askQuestion')}
          </h1>
          <p className="text-muted-foreground">
            {language === 'en' 
              ? 'Ask anything about farming, crops, weather, or agricultural practices'
              : 'कृषि, फसल, मौसम, या कृषि प्रथाओं के बारे में कुछ भी पूछें'
            }
          </p>
        </div>

        {/* Query Input */}
        <Card className="glass-card">
          <CardContent className="p-6 space-y-4">
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('askQuestion')}
              className="min-h-[120px] resize-none border-glass-border focus:ring-primary"
              disabled={isLoading}
            />

            {/* Image Upload */}
            {imageFile && (
              <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-radius">
                <PhotoIcon className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{imageFile.name}</span>
                {uploadedImage && (
                  <span className="text-xs text-success">
                    ✓ {uploadedImage.label} ({Math.round(uploadedImage.confidence * 100)}%)
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setImageFile(null);
                    setUploadedImage(null);
                  }}
                  className="ml-auto text-xs"
                >
                  Remove
                </Button>
              </div>
            )}

            {/* Controls */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleSubmit}
                disabled={!query.trim() || isLoading}
                className="btn-hover bg-primary hover:bg-primary-light"
              >
                <PaperAirplaneIcon className="w-4 h-4 mr-2" />
                {isLoading ? t('loading') : t('submit')}
              </Button>

              <Button
                variant="outline"
                onClick={handleVoiceInput}
                disabled={isListening || isLoading}
                className="btn-hover"
              >
                <MicrophoneIcon className={`w-4 h-4 mr-2 ${isListening ? 'animate-pulse text-destructive' : ''}`} />
                {isListening ? t('speakNow') : 'Voice'}
              </Button>

              <Button
                variant="outline"
                onClick={() => document.getElementById('image-upload')?.click()}
                disabled={isLoading}
                className="btn-hover"
              >
                <PhotoIcon className="w-4 h-4 mr-2" />
                {t('uploadImage')}
              </Button>

              <input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <div className="inline-flex items-center gap-2 text-primary">
              <SparklesIcon className="w-6 h-6 animate-pulse" />
              <span className="text-lg font-medium">
                {imageFile && !uploadedImage 
                  ? (language === 'en' ? 'Analyzing image...' : 'छवि का विश्लेषण कर रहे हैं...')
                  : (language === 'en' ? 'AI is thinking...' : 'AI सोच रहा है...')
                }
              </span>
            </div>
          </motion.div>
        )}

        {/* Response */}
        {response && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Main Answer */}
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="text-lg font-semibold">
                    {language === 'en' ? 'AI Response' : 'AI का उत्तर'}
                  </span>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const ConfidenceIcon = getConfidenceIcon(response.confidence);
                      return (
                        <Badge 
                          variant="outline" 
                          className={`${getConfidenceColor(response.confidence)} border-current`}
                        >
                          <ConfidenceIcon className="w-3 h-3 mr-1" />
                          {t('confidence')}: {Math.round(response.confidence * 100)}%
                        </Badge>
                      );
                    })()}
                    {response.meta?.mode && (
                      <Badge variant="secondary" className="text-xs">
                        {response.meta.mode === 'demo' ? 'Demo Mode' : 
                         response.meta.mode === 'fallback' ? 'Fallback' : 'AI'}
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground leading-relaxed text-lg">
                  {response.answer}
                </p>
              </CardContent>
            </Card>

            {/* Actions */}
            {response.actions.length > 0 && (
              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold">
                    {language === 'en' ? 'Recommended Actions' : 'सुझाए गए कार्य'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {response.actions.map((action, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-medium text-primary">{index + 1}</span>
                        </div>
                        <span className="text-foreground">{action}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Sources */}
            {response.sources.length > 0 && (
              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold">
                    {t('sources')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {response.sources.map((source, index) => (
                      <div key={index} className="p-3 bg-muted/30 rounded-radius">
                        <h4 className="font-medium text-foreground mb-1">{source.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{source.snippet}</p>
                        {source.url && (
                          <a 
                            href={source.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                            onClick={() => analytics.track('source_clicked', { url: source.url, title: source.title })}
                          >
                            {source.url}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Show demo mode banner if applicable */}
            {response?.meta?.mode === 'demo' && (
              <Card className="glass-card border-warning/50 bg-warning/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-warning">
                    <ExclamationTriangleIcon className="w-5 h-5" />
                    <span className="font-medium">
                      {language === 'en' ? 'Demo Mode' : 'डेमो मोड'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {language === 'en' 
                      ? 'This response was generated using fallback logic. For production use, configure HF_API_KEY.'
                      : 'यह प्रतिक्रिया फॉलबैक लॉजिक का उपयोग करके उत्पन्न की गई थी। उत्पादन उपयोग के लिए, HF_API_KEY कॉन्फ़िगर करें।'
                    }
                  </p>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default QueryPage;
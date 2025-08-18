import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CameraIcon, 
  PhotoIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from '@/lib/i18n';
import { apiClient, UploadResponse, ChemRecoResponse } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { analytics } from '@/lib/analytics';

const DiagnosticsPage = () => {
  const { t, language } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedImage, setUploadedImage] = useState<UploadResponse | null>(null);
  const [selectedCrop, setSelectedCrop] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [severity, setSeverity] = useState('moderate');
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState<ChemRecoResponse | null>(null);
  const { toast } = useToast();

  const crops = [
    { value: 'tomato', label: language === 'en' ? 'Tomato' : 'टमाटर' },
    { value: 'wheat', label: language === 'en' ? 'Wheat' : 'गेहूं' },
    { value: 'rice', label: language === 'en' ? 'Rice' : 'चावल' },
    { value: 'cotton', label: language === 'en' ? 'Cotton' : 'कपास' },
    { value: 'potato', label: language === 'en' ? 'Potato' : 'आलू' },
    { value: 'onion', label: language === 'en' ? 'Onion' : 'प्याज' },
    { value: 'chili', label: language === 'en' ? 'Chili' : 'मिर्च' },
    { value: 'maize', label: language === 'en' ? 'Maize' : 'मक्का' }
  ];

  const severityOptions = [
    { value: 'mild', label: language === 'en' ? 'Mild' : 'हल्का' },
    { value: 'moderate', label: language === 'en' ? 'Moderate' : 'मध्यम' },
    { value: 'severe', label: language === 'en' ? 'Severe' : 'गंभीर' }
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 10MB",
          variant: "destructive",
        });
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select a valid image file",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
      setUploadedImage(null);
      setRecommendations(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    analytics.featureUsed('image_upload');

    try {
      const result = await apiClient.uploadImage(selectedFile);
      setUploadedImage(result);
      
      // Show appropriate feedback based on upload mode
      if (result.meta?.storage === 'local_fallback') {
        toast({
          title: "Image processed (offline mode)",
          description: "Image saved locally while services reconnect",
        });
      } else {
        toast({
          title: "Image uploaded successfully",
          description: `Detected: ${result.label} (${Math.round(result.confidence * 100)}% confidence)`,
        });
      }

      analytics.track('image_uploaded', {
        label: result.label,
        confidence: result.confidence,
        storage: result.meta.storage
      });
    } catch (error) {
      console.error('Upload failed:', error);
      // This should rarely happen due to fallback in apiClient
      toast({
        title: "Upload issue",
        description: "Please try again or check your connection",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedCrop || !symptoms) {
      toast({
        title: "Missing information",
        description: "Please select a crop and describe the symptoms",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    analytics.featureUsed('crop_diagnosis');

    try {
      const result = await apiClient.chemReco({
        crop: selectedCrop,
        symptom: symptoms,
        image_id: uploadedImage?.image_id,
        severity: severity
      });

      setRecommendations(result);
      
      analytics.track('diagnosis_completed', {
        crop: selectedCrop,
        confidence: result.confidence,
        has_image: !!uploadedImage,
        mode: result.meta?.fallback_reason ? 'fallback' : 'api'
      });

      // Show appropriate feedback
      if (result.meta?.fallback_reason) {
        toast({
          title: "Analysis complete (offline mode)",
          description: "Using general guidelines while services reconnect",
        });
      } else {
        toast({
          title: "Analysis complete",
          description: `Diagnosis confidence: ${Math.round(result.confidence * 100)}%`,
        });
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      analytics.errorOccurred('diagnosis_failed', 'DiagnosticsPage');
      
      // This should rarely happen due to fallback in apiClient
      toast({
        title: "Analysis issue",
        description: "Please try again or check your connection",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2 text-foreground flex items-center justify-center gap-2">
            <CameraIcon className="w-8 h-8 text-secondary-dark" />
            {t('diagnostics')}
          </h1>
          <p className="text-foreground/80 font-medium">
            {language === 'en' 
              ? 'Upload crop images and get expert diagnosis with treatment recommendations'
              : 'फसल की तस्वीरें अपलोड करें और उपचार की सिफारिशों के साथ विशेषज्ञ निदान प्राप्त करें'
            }
          </p>
        </div>

        {/* Image Upload Section */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PhotoIcon className="w-5 h-5" />
              {language === 'en' ? 'Upload Crop Image' : 'फसल की तस्वीर अपलोड करें'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-radius-lg p-8 text-center">
              {selectedFile ? (
                <div className="space-y-4">
                  <img 
                    src={URL.createObjectURL(selectedFile)} 
                    alt="Selected crop" 
                    className="max-h-48 mx-auto rounded-radius shadow-soft"
                  />
                  <p className="text-sm text-foreground/70 font-medium">{selectedFile.name}</p>
                  {uploadedImage && (
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircleIcon className="w-5 h-5 text-success" />
                      <span className="text-success font-medium">
                        Detected: {uploadedImage.label} ({Math.round(uploadedImage.confidence * 100)}%)
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <CameraIcon className="w-16 h-16 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-lg font-medium text-foreground">
                      {language === 'en' ? 'Upload a crop image' : 'फसल की तस्वीर अपलोड करें'}
                    </p>
                    <p className="text-sm text-foreground/70">
                      {language === 'en' 
                        ? 'Take a clear photo of affected leaves, stems, or fruits'
                        : 'प्रभावित पत्तियों, तनों या फलों की स्पष्ट तस्वीर लें'
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => document.getElementById('file-upload')?.click()}
                className="flex-1"
              >
                <PhotoIcon className="w-4 h-4 mr-2" />
                {selectedFile ? 
                  (language === 'en' ? 'Change Image' : 'तस्वीर बदलें') : 
                  (language === 'en' ? 'Select Image' : 'तस्वीर चुनें')
                }
              </Button>
              
              {selectedFile && !uploadedImage && (
                <Button 
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="flex-1"
                >
                  {isUploading ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                      {language === 'en' ? 'Uploading...' : 'अपलोड हो रहा है...'}
                    </>
                  ) : (
                    language === 'en' ? 'Upload & Analyze' : 'अपलोड और विश्लेषण'
                  )}
                </Button>
              )}
            </div>
            
            <input
              id="file-upload"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </CardContent>
        </Card>

        {/* Crop Information Form */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>
              {language === 'en' ? 'Crop Information' : 'फसल की जानकारी'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block text-foreground">
                  {language === 'en' ? 'Crop Type' : 'फसल का प्रकार'}
                </label>
                <Select value={selectedCrop} onValueChange={setSelectedCrop}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'en' ? 'Select crop' : 'फसल चुनें'} />
                  </SelectTrigger>
                  <SelectContent>
                    {crops.map(crop => (
                      <SelectItem key={crop.value} value={crop.value}>
                        {crop.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block text-foreground">
                  {language === 'en' ? 'Severity' : 'गंभीरता'}
                </label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {severityOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block text-foreground">
                {language === 'en' ? 'Describe Symptoms' : 'लक्षणों का वर्णन करें'}
              </label>
              <Textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder={language === 'en' 
                  ? 'Describe what you observe: yellowing leaves, brown spots, wilting, etc.'
                  : 'आप जो देखते हैं उसका वर्णन करें: पीली पत्तियां, भूरे धब्बे, मुरझाना, आदि।'
                }
                rows={3}
                className="text-foreground"
              />
            </div>
            
            <Button 
              onClick={handleAnalyze}
              disabled={!selectedCrop || !symptoms || isAnalyzing}
              className="w-full"
            >
              {isAnalyzing ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                  {language === 'en' ? 'Analyzing...' : 'विश्लेषण कर रहे हैं...'}
                </>
              ) : (
                language === 'en' ? 'Get Diagnosis & Recommendations' : 'निदान और सिफारिशें प्राप्त करें'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Recommendations */}
        {recommendations && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Fallback mode indicator */}
            {recommendations.meta?.fallback_reason && (
              <Card className="glass-card border-warning/50 bg-warning/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-warning">
                    <ExclamationTriangleIcon className="w-5 h-5" />
                    <span className="font-medium">
                      {language === 'en' ? 'Offline Diagnosis Mode' : 'ऑफलाइन निदान मोड'}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/70 mt-1">
                    {language === 'en' 
                      ? 'Providing general guidance while reconnecting to diagnostic services'
                      : 'निदान सेवाओं से पुनः कनेक्ट करते समय सामान्य मार्गदर्शन प्रदान कर रहे हैं'
                    }
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Diagnosis */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between flex-wrap gap-2">
                  <span>{language === 'en' ? 'Diagnosis' : 'निदान'}</span>
                  <Badge 
                    variant="outline" 
                    className={`${recommendations.confidence > 0.7 ? 'text-success border-success' : 
                                recommendations.confidence > 0.4 ? 'text-warning border-warning' : 
                                'text-destructive border-destructive'}`}
                  >
                    {Math.round(recommendations.confidence * 100)}% {language === 'en' ? 'confidence' : 'विश्वास'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground leading-relaxed">{recommendations.diagnosis}</p>
              </CardContent>
            </Card>

            {/* Warnings */}
            {recommendations.warnings.length > 0 && (
              <Card className="glass-card border-warning/50 bg-warning/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-warning">
                    <ExclamationTriangleIcon className="w-5 h-5" />
                    {language === 'en' ? 'Important Warnings' : 'महत्वपूर्ण चेतावनी'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {recommendations.warnings.map((warning, index) => (
                      <li key={index} className="text-sm text-foreground">
                        {warning}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>
                  {language === 'en' ? 'Treatment Recommendations' : 'उपचार की सिफारिशें'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recommendations.recommendations.map((rec, index) => (
                    <div key={index} className="p-4 bg-muted/20 rounded-radius">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={rec.type === 'chemical' ? 'destructive' : 
                                     rec.type === 'biological' ? 'default' : 'secondary'}>
                          {rec.type}
                        </Badge>
                        <h4 className="font-medium text-foreground">{rec.method}</h4>
                      </div>
                      <p className="text-sm text-foreground/80 mb-2">{rec.description}</p>
                      <p className="text-xs text-foreground/70 mb-2">
                        <strong>{language === 'en' ? 'Timing:' : 'समय:'}</strong> {rec.timing}
                      </p>
                      {rec.precautions.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-warning mb-1">
                            {language === 'en' ? 'Precautions:' : 'सावधानियां:'}
                          </p>
                          <ul className="text-xs text-foreground/70 space-y-1">
                            {rec.precautions.map((precaution, idx) => (
                              <li key={idx}>• {precaution}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>
                  {language === 'en' ? 'Next Steps' : 'अगले कदम'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {recommendations.next_steps.map((step, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-medium text-primary">{index + 1}</span>
                      </span>
                      <span className="text-sm text-foreground">{step}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default DiagnosticsPage;
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DocumentTextIcon, 
  ArrowTopRightOnSquareIcon, 
  CheckCircleIcon, 
  CurrencyRupeeIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from '@/lib/i18n';
import { analytics } from '@/lib/analytics';
import { apiClient, PolicyMatchResponse } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const SchemesPage = () => {
  const { t, language } = useTranslation();
  const [selectedState, setSelectedState] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('');
  const [schemesData, setSchemesData] = useState<PolicyMatchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const states = [
    'Karnataka', 'Maharashtra', 'Punjab', 'Haryana', 'Uttar Pradesh',
    'Madhya Pradesh', 'Rajasthan', 'Gujarat', 'Tamil Nadu', 'Andhra Pradesh'
  ];

  const crops = [
    { value: '', label: language === 'en' ? 'All Crops' : 'सभी फसलें' },
    { value: 'wheat', label: language === 'en' ? 'Wheat' : 'गेहूं' },
    { value: 'rice', label: language === 'en' ? 'Rice' : 'चावल' },
    { value: 'cotton', label: language === 'en' ? 'Cotton' : 'कपास' },
    { value: 'sugarcane', label: language === 'en' ? 'Sugarcane' : 'गन्ना' },
    { value: 'tomato', label: language === 'en' ? 'Tomato' : 'टमाटर' }
  ];

  const fetchSchemes = async () => {
    if (!selectedState) return;

    setIsLoading(true);
    analytics.featureUsed('schemes_search');

    try {
      const data = await apiClient.policyMatch({
        state: selectedState,
        crop: selectedCrop || undefined
      });
      
      setSchemesData(data);
      
      analytics.track('schemes_fetched', {
        state: selectedState,
        crop: selectedCrop,
        total_matches: data.total_matches,
        mode: data.meta?.fallback_reason ? 'fallback' : 'api'
      });

      // Show appropriate feedback
      if (data.meta?.fallback_reason) {
        toast({
          title: "Schemes loaded (offline mode)",
          description: "Showing general schemes while reconnecting to services",
        });
      }
    } catch (error) {
      console.error('Schemes fetch failed:', error);
      analytics.errorOccurred('schemes_fetch_failed', 'SchemesPage');
      
      // This should rarely happen due to fallback in apiClient
      toast({
        title: "Schemes data issue",
        description: "Please try again or check your connection",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedState) {
      fetchSchemes();
    }
  }, [selectedState, selectedCrop]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2 text-foreground flex items-center justify-center gap-2">
            <DocumentTextIcon className="w-8 h-8 text-success" />
            {t('govSchemes')}
          </h1>
          <p className="text-foreground/80 font-medium max-w-2xl mx-auto">
            {language === 'en' 
              ? 'Comprehensive list of government schemes with eligibility criteria and application details'
              : 'पात्रता मानदंड और आवेदन विवरण के साथ सरकारी योजनाओं की व्यापक सूची'
            }
          </p>
        </div>

        {/* Filters */}
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block text-foreground">
                  {language === 'en' ? 'State' : 'राज्य'}
                </label>
                <Select value={selectedState} onValueChange={setSelectedState}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'en' ? 'Select your state' : 'अपना राज्य चुनें'} />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block text-foreground">
                  {language === 'en' ? 'Crop (Optional)' : 'फसल (वैकल्पिक)'}
                </label>
                <Select value={selectedCrop} onValueChange={setSelectedCrop}>
                  <SelectTrigger>
                    <SelectValue />
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
            <DocumentTextIcon className="w-12 h-12 mx-auto text-success animate-pulse mb-4" />
            <p className="text-lg font-medium text-foreground/80">
              {language === 'en' ? 'Loading schemes...' : 'योजनाएं लोड हो रही हैं...'}
            </p>
          </motion.div>
        )}

        {/* Schemes Results */}
        {schemesData && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Fallback mode indicator */}
            {schemesData.meta?.fallback_reason && (
              <Card className="glass-card border-warning/50 bg-warning/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-warning">
                    <ExclamationTriangleIcon className="w-5 h-5" />
                    <span className="font-medium">
                      {language === 'en' ? 'Offline Schemes Mode' : 'ऑफलाइन योजना मोड'}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/70 mt-1">
                    {language === 'en' 
                      ? 'Showing general schemes while reconnecting to government databases'
                      : 'सरकारी डेटाबेस से पुनः कनेक्ट करते समय सामान्य योजनाएं दिखा रहे हैं'
                    }
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Results Summary */}
            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {language === 'en' ? 'Matching Schemes Found' : 'मिलान योजनाएं मिलीं'}
                  </h3>
                  <div className="text-3xl font-bold text-primary mb-2">
                    {schemesData.total_matches}
                  </div>
                  <p className="text-sm text-foreground/70">
                    {language === 'en' 
                      ? `schemes available for ${selectedState}${selectedCrop ? ` (${selectedCrop})` : ''}`
                      : `${selectedState}${selectedCrop ? ` (${selectedCrop})` : ''} के लिए योजनाएं उपलब्ध`
                    }
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Schemes Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {schemesData.matched_schemes.map((scheme, index) => (
                <motion.div
                  key={scheme.code}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="glass-card h-full">
                    <CardHeader>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <CardTitle className="text-xl text-foreground">{scheme.name}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-success border-success">
                            <CheckCircleIcon className="w-3 h-3 mr-1" />
                            {language === 'en' ? 'Active' : 'सक्रिय'}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-foreground/80">{scheme.description}</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                          <CheckCircleIcon className="w-4 h-4 text-success" />
                          {language === 'en' ? 'Eligibility' : 'पात्रता'}
                        </h4>
                        <ul className="space-y-1">
                          {scheme.eligibility.map((item, idx) => (
                            <li key={idx} className="text-sm text-foreground/80 flex items-start gap-2">
                              <span className="w-1 h-1 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                          <DocumentTextIcon className="w-4 h-4 text-accent-dark" />
                          {language === 'en' ? 'Required Documents' : 'आवश्यक दस्तावेज'}
                        </h4>
                        <ul className="space-y-1">
                          {scheme.required_docs.map((doc, idx) => (
                            <li key={idx} className="text-sm text-foreground/80 flex items-start gap-2">
                              <span className="w-1 h-1 bg-accent-dark rounded-full mt-2 flex-shrink-0"></span>
                              {doc}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-4">
                        <Button asChild className="w-full">
                          <a 
                            href={scheme.application_url || '#'} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center gap-2"
                            onClick={() => analytics.track('scheme_application_clicked', { scheme: scheme.name })}
                          >
                            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                            {language === 'en' ? 'Apply Online' : 'ऑनलाइन आवेदन करें'}
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Recommendations */}
            {schemesData.recommendations.length > 0 && (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>
                    {language === 'en' ? 'Personalized Recommendations' : 'व्यक्तिगत सिफारिशें'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {schemesData.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-medium text-primary">{index + 1}</span>
                        </span>
                        <span className="text-sm text-foreground">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* Help Section */}
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold text-foreground">
                {language === 'en' ? 'Need Help with Applications?' : 'आवेदनों में सहायता चाहिए?'}
              </h3>
              <p className="text-foreground/80">
                {language === 'en' 
                  ? 'Visit your nearest Common Service Center (CSC) or Krishi Vigyan Kendra (KVK) for assistance'
                  : 'सहायता के लिए अपने निकटतम कॉमन सर्विस सेंटर (CSC) या कृषि विज्ञान केंद्र (KVK) पर जाएं'
                }
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="outline" asChild>
                  <a 
                    href="https://www.csc.gov.in/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={() => analytics.track('external_link_clicked', { service: 'CSC' })}
                  >
                    {language === 'en' ? 'Find CSC Near You' : 'अपने पास CSC खोजें'}
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a 
                    href="https://kvk.icar.gov.in/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={() => analytics.track('external_link_clicked', { service: 'KVK' })}
                  >
                    {language === 'en' ? 'Locate KVK' : 'KVK का पता लगाएं'}
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default SchemesPage;
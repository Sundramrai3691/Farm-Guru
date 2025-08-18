import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DocumentTextIcon, 
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from '@/lib/i18n';
import { analytics } from '@/lib/analytics';
import { apiClient, PolicyMatchResponse } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

/** Fallback data if API fails */
const fallbackSchemes: PolicyMatchResponse = {
  total_matches: 0,
  matched_schemes: [],
  recommendations: [],
  meta: { fallback_reason: 'offline_fallback' }
};

/** ErrorBoundary to catch unexpected errors and prevent blank screen */
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: any) {
    console.error("ErrorBoundary caught:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 text-red-700 rounded">
          <strong>Something went wrong while loading schemes.</strong>
          <div className="mt-2 text-sm">{this.state.error?.message}</div>
          <div className="mt-3">
            <button onClick={() => window.location.reload()} className="underline">
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Ensures SelectItem always has a non-empty value */
const safeValue = (val: string | undefined, idx: number) => {
  const s = (val ?? "").trim();
  return s !== "" ? s : `fallback-${idx}`;
};

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

  /** Fetch schemes with layered fallback */
  const fetchSchemes = async () => {
    if (!selectedState) return;
    setIsLoading(true);
    analytics.featureUsed('schemes_search');

    try {
      const data = await apiClient.policyMatch({
        state: selectedState,
        crop: selectedCrop || undefined
      });

      if (!data || !data.matched_schemes) {
        setSchemesData(fallbackSchemes);
        toast({
          title: "Showing fallback schemes",
          description: "Unable to fetch live data, displaying default schemes.",
          variant: "destructive",
        });
      } else {
        setSchemesData(data);
        if (data.meta?.fallback_reason) {
          toast({
            title: "Schemes loaded (offline mode)",
            description: "Showing general schemes while reconnecting to services",
          });
        }
      }

      analytics.track('schemes_fetched', {
        state: selectedState,
        crop: selectedCrop,
        total_matches: data?.total_matches ?? 0,
        mode: data?.meta?.fallback_reason ? 'fallback' : 'api'
      });
    } catch (error) {
      console.error('Schemes fetch failed:', error);
      analytics.errorOccurred('schemes_fetch_failed', 'SchemesPage');

      setSchemesData(fallbackSchemes);
      toast({
        title: "Schemes data issue",
        description: "Showing fallback data. Check your connection.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedState) fetchSchemes();
  }, [selectedState, selectedCrop]);

  const safeData = schemesData || fallbackSchemes;

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          {/* Page Header */}
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
                      {states.map((state, idx) => (
                        <SelectItem key={state} value={safeValue(state, idx)}>{state}</SelectItem>
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
                      {crops.map((crop, idx) => (
                        <SelectItem key={safeValue(crop.value, idx)} value={safeValue(crop.value, idx)}>
                          {crop.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schemes List */}
          {isLoading ? (
            <div className="text-center text-foreground/70 mt-8">Loading schemes...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
              {safeData.matched_schemes.length === 0 ? (
                <div className="col-span-full text-center text-foreground/70">
                  No schemes found for this state/crop.
                </div>
              ) : (
                safeData.matched_schemes.map((scheme, idx) => (
                  <Card key={idx} className="border border-foreground/10 hover:shadow-lg transition">
                    <CardHeader>
                      <CardTitle>{scheme.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-foreground/80">{scheme.description}</p>
                      {scheme.application_url && (
                        <div className="mt-2 flex justify-end">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => window.open(scheme.application_url, '_blank')}
                          >
                            View Details <ArrowTopRightOnSquareIcon className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

        </motion.div>
      </div>
    </ErrorBoundary>
  );
};

export default SchemesPage;

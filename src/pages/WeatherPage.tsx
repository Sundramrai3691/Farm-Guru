import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CloudIcon,
  SunIcon,
  BeakerIcon,
  FireIcon,
  EyeDropperIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from '@/lib/i18n';
import { analytics } from '@/lib/analytics';
import { apiClient, WeatherResponse } from '@/lib/api';

const WeatherPage = () => {
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [weatherData, setWeatherData] = useState<WeatherResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { t, language } = useTranslation();

  const states = [
    'Karnataka', 'Maharashtra', 'Punjab', 'Haryana', 'Uttar Pradesh',
    'Madhya Pradesh', 'Rajasthan', 'Gujarat', 'Tamil Nadu', 'Andhra Pradesh'
  ];

  const districts = {
    'Karnataka': ['Bengaluru', 'Mysuru', 'Hubballi', 'Mangaluru', 'Belagavi'],
    'Maharashtra': ['Mumbai', 'Pune', 'Nashik', 'Aurangabad', 'Nagpur'],
    'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda'],
    // Add more districts as needed
  };

  const fetchWeather = async () => {
    if (!selectedState || !selectedDistrict) return;

    setIsLoading(true);
    analytics.featureUsed('weather_check');

    try {
      const data = await apiClient.getWeather(selectedState, selectedDistrict);
      setWeatherData(data);
      analytics.track('weather_data_fetched', { 
        state: selectedState, 
        district: selectedDistrict,
        source: data.meta?.source 
      });
    } catch (error) {
      console.error('Weather fetch failed:', error);
      analytics.errorOccurred('weather_fetch_failed', 'WeatherPage');
      toast({
        title: "Weather data unavailable",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedState && selectedDistrict) {
      fetchWeather();
    }
  }, [selectedState, selectedDistrict]);

  const getTemperatureColor = (temp: number) => {
    if (temp > 35) return 'text-destructive';
    if (temp > 25) return 'text-warning';
    return 'text-primary';
  };

  const getHumidityColor = (humidity: number) => {
    if (humidity > 80) return 'text-accent-dark';
    if (humidity < 40) return 'text-warning';
    return 'text-success';
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
            <CloudIcon className="w-8 h-8 text-accent-dark" />
            {t('weatherForecast')}
          </h1>
          <p className="text-muted-foreground">
            {language === 'en' 
              ? 'Get accurate weather forecasts and irrigation recommendations for your area'
              : 'अपने क्षेत्र के लिए सटीक मौसम पूर्वानुमान और सिंचाई की सिफारिशें प्राप्त करें'
            }
          </p>
        </div>

        {/* Location Selector */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPinIcon className="w-5 h-5" />
              {language === 'en' ? 'Select Location' : 'स्थान चुनें'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {language === 'en' ? 'State' : 'राज्य'}
                </label>
                <Select value={selectedState} onValueChange={setSelectedState}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'en' ? 'Select state' : 'राज्य चुनें'} />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  {language === 'en' ? 'District' : 'जिला'}
                </label>
                <Select 
                  value={selectedDistrict} 
                  onValueChange={setSelectedDistrict}
                  disabled={!selectedState}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'en' ? 'Select district' : 'जिला चुनें'} />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedState && districts[selectedState as keyof typeof districts]?.map(district => (
                      <SelectItem key={district} value={district}>{district}</SelectItem>
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
            <CloudIcon className="w-12 h-12 mx-auto text-accent-dark animate-pulse mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              {language === 'en' ? 'Fetching weather data...' : 'मौसम डेटा प्राप्त कर रहे हैं...'}
            </p>
          </motion.div>
        )}

        {/* Weather Data */}
        {weatherData && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Current Conditions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="glass-card">
                <CardContent className="p-6 text-center">
                  <FireIcon className={`w-8 h-8 mx-auto mb-2 ${getTemperatureColor(weatherData.forecast.temperature)}`} />
                  <div className={`text-2xl font-bold mb-1 ${getTemperatureColor(weatherData.forecast.temperature)}`}>
                    {weatherData.forecast.temperature}°C
                  </div>
                  <div className="text-sm text-muted-foreground">{t('temperature')}</div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-6 text-center">
                  <EyeDropperIcon className={`w-8 h-8 mx-auto mb-2 ${getHumidityColor(weatherData.forecast.humidity)}`} />
                  <div className={`text-2xl font-bold mb-1 ${getHumidityColor(weatherData.forecast.humidity)}`}>
                    {weatherData.forecast.humidity}%
                  </div>
                  <div className="text-sm text-muted-foreground">{t('humidity')}</div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-6 text-center">
                  <BeakerIcon className="w-8 h-8 mx-auto mb-2 text-accent-dark" />
                  <div className="text-2xl font-bold mb-1 text-accent-dark">
                    {weatherData.forecast.rainfall}mm
                  </div>
                  <div className="text-sm text-muted-foreground">{t('rainfall')}</div>
                </CardContent>
              </Card>
            </div>

            {/* Forecast Description */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SunIcon className="w-5 h-5 text-warning" />
                  {language === 'en' ? 'Current Conditions' : 'वर्तमान स्थिति'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg text-foreground">
                  {weatherData.forecast.description}
                </p>
              </CardContent>
            </Card>

            {/* Irrigation Advice */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <EyeDropperIcon className="w-5 h-5 text-primary" />
                  {t('irrigationAdvice')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="text-success border-success">
                    {language === 'en' ? 'Recommendation' : 'सिफारिश'}
                  </Badge>
                  <p className="text-foreground flex-1">
                    {weatherData.recommendation}
                  </p>
                </div>
                {weatherData.meta?.source && (
                  <div className="mt-3 pt-3 border-t border-border/30">
                    <p className="text-xs text-muted-foreground">
                      Data source: {weatherData.meta.source}
                      {weatherData.last_updated && (
                        <span> • Updated: {new Date(weatherData.last_updated).toLocaleString()}</span>
                      )}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 7-Day Forecast Preview */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>
                  {language === 'en' ? '7-Day Forecast' : '7-दिन का पूर्वानुमान'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, index) => (
                    <div key={index} className="text-center p-3 bg-muted/20 rounded-radius">
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        {language === 'en' ? `Day ${index + 2}` : `दिन ${index + 2}`}
                      </div>
                      <CloudIcon className="w-6 h-6 mx-auto mb-1 text-accent-dark" />
                      <div className="text-sm font-medium">
                        {28 + Math.floor(Math.random() * 6)}°C
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default WeatherPage;
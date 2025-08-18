import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  MicrophoneIcon,
  SparklesIcon,
  CloudIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CameraIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from '@/lib/i18n';
import { analytics } from '@/lib/analytics';
import heroImage from '@/assets/hero-farm.jpg';

const HomePage = () => {
  const [isListening, setIsListening] = useState(false);
  const { t, language } = useTranslation();

  const quickPrompts = [
    {
      text: language === 'en' 
        ? "What's the best time to plant wheat?"
        : "गेहूं बोने का सबसे अच्छा समय क्या है?",
      category: 'planting'
    },
    {
      text: language === 'en' 
        ? "How to control pest attacks on tomatoes?"
        : "टमाटर पर कीट आक्रमण को कैसे नियंत्रित करें?",
      category: 'pest'
    },
    {
      text: language === 'en' 
        ? "Current wheat prices in my area"
        : "मेरे क्षेत्र में वर्तमान गेहूं की कीमतें",
      category: 'market'
    },
    {
      text: language === 'en' 
        ? "Irrigation schedule for cotton crop"
        : "कपास की फसल के लिए सिंचाई कार्यक्रम",
      category: 'irrigation'
    }
  ];

  const features = [
    {
      icon: SparklesIcon,
      title: language === 'en' ? 'AI Assistant' : 'AI सहायक',
      description: language === 'en' 
        ? 'Get instant answers to your farming questions'
        : 'अपने कृषि प्रश्नों के तुरंत उत्तर प्राप्त करें',
      href: '/query',
      color: 'text-primary'
    },
    {
      icon: CloudIcon,
      title: language === 'en' ? 'Weather Forecast' : 'मौसम पूर्वानुमान',
      description: language === 'en' 
        ? 'Plan your farming activities with accurate weather data'
        : 'सटीक मौसम डेटा के साथ अपनी कृषि गतिविधियों की योजना बनाएं',
      href: '/weather',
      color: 'text-accent-dark'
    },
    {
      icon: ChartBarIcon,
      title: language === 'en' ? 'Market Prices' : 'बाजार की कीमतें',
      description: language === 'en' 
        ? 'Track commodity prices and make informed selling decisions'
        : 'कमोडिटी की कीमतों को ट्रैक करें और सूचित बिक्री निर्णय लें',
      href: '/market',
      color: 'text-warning'
    },
    {
      icon: DocumentTextIcon,
      title: language === 'en' ? 'Gov Schemes' : 'सरकारी योजनाएं',
      description: language === 'en' 
        ? 'Discover and apply for government farming schemes'
        : 'सरकारी कृषि योजनाओं की खोज करें और आवेदन करें',
      href: '/schemes',
      color: 'text-success'
    },
    {
      icon: CameraIcon,
      title: language === 'en' ? 'Crop Diagnosis' : 'फसल निदान',
      description: language === 'en' 
        ? 'Upload crop images for disease and pest identification'
        : 'रोग और कीट की पहचान के लिए फसल की तस्वीरें अपलोड करें',
      href: '/diagnostics',
      color: 'text-secondary-dark'
    }
  ];

  const handleVoiceInput = () => {
    setIsListening(true);
    analytics.featureUsed('voice_input');
    
    // Simulate voice input
    setTimeout(() => {
      setIsListening(false);
      // In real implementation, would navigate to query page with voice result
    }, 3000);
  };

  const handleQuickPrompt = (prompt: string, category: string) => {
    analytics.track('quick_prompt_clicked', { category, prompt: prompt.substring(0, 50) });
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-background/90 via-background/70 to-transparent" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-4xl mx-auto"
          >
            <motion.h1 
              className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 hero-text"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              {t('heroTitle')}
            </motion.h1>
            
            <motion.p 
              className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              {t('heroSubtitle')}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              <Button
                size="lg"
                onClick={handleVoiceInput}
                disabled={isListening}
                className="btn-hover bg-primary hover:bg-primary-light text-primary-foreground px-8 py-4 text-lg font-semibold rounded-radius-lg animate-pulse-glow"
              >
                <MicrophoneIcon className={`w-5 h-5 mr-2 ${isListening ? 'animate-pulse' : ''}`} />
                {isListening ? 
                  (language === 'en' ? 'Listening...' : 'सुन रहा है...') : 
                  t('voiceCTA')
                }
              </Button>
              
              <Button
                asChild
                variant="outline"
                size="lg"
                className="btn-hover border-primary/30 text-foreground hover:bg-primary/10 px-8 py-4 text-lg font-semibold rounded-radius-lg"
              >
                <Link to="/query">
                  onClick={() => analytics.track('cta_clicked', { button: 'ask_ai_assistant', location: 'hero' })}
                  <SparklesIcon className="w-5 h-5 mr-2" />
                  {language === 'en' ? 'Ask AI Assistant' : 'AI सहायक से पूछें'}
                </Link>
              </Button>
            </motion.div>

            {/* Quick Prompts */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              className="max-w-3xl mx-auto"
            >
              <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide">
                {t('quickPrompts')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {quickPrompts.map((prompt, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1 + index * 0.1, duration: 0.5 }}
                  >
                    <Button
                      variant="ghost"
                      className="w-full text-left p-4 h-auto glass-card hover:bg-primary/5 transition-all duration-300 group"
                      asChild
                    >
                      <Link 
                        to={`/query?q=${encodeURIComponent(prompt.text)}`}
                        onClick={() => handleQuickPrompt(prompt.text, prompt.category)}
                      >
                        <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                          "{prompt.text}"
                        </span>
                      </Link>
                    </Button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Floating elements */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 right-10 w-16 h-16 bg-primary/20 rounded-full blur-xl"
        />
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-20 left-10 w-24 h-24 bg-accent/20 rounded-full blur-xl"
        />
      </section>

      {/* Features Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              {language === 'en' ? 'Everything You Need for Smart Farming' : 'स्मार्ट फार्मिंग के लिए आपको जो कुछ भी चाहिए'}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {language === 'en' 
                ? 'Comprehensive tools and insights to help you make data-driven farming decisions'
                : 'डेटा-संचालित कृषि निर्णय लेने में आपकी सहायता के लिए व्यापक उपकरण और अंतर्दृष्टि'
              }
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
                className="group"
              >
                <Card className="glass-card border-glass-border hover:shadow-elevated transition-all duration-300 h-full">
                  <CardContent className="p-6 text-center h-full flex flex-col">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-radius-lg bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <feature.icon className={`w-8 h-8 ${feature.color}`} />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground mb-4 flex-1">
                      {feature.description}
                    </p>
                    <Button
                      asChild
                      variant="ghost"
                      className="mt-auto group-hover:bg-primary/10 transition-colors"
                    >
                      <Link to={feature.href}>
                        onClick={() => analytics.track('feature_card_clicked', { feature: feature.title, href: feature.href })}
                        {language === 'en' ? 'Explore' : 'एक्सप्लोर करें'} →
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
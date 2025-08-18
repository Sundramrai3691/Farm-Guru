import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DocumentTextIcon, ArrowTopRightOnSquareIcon, CheckCircleIcon, CurrencyRupeeIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '@/lib/i18n';

const SchemesPage = () => {
  const { t, language } = useTranslation();

  const schemes = [
    {
      name: 'PM-KISAN',
      description: language === 'en' ? 'Income support scheme providing ₹6000 annually to farmer families' : 'किसान परिवारों को सालाना ₹6000 की आय सहायता योजना',
      amount: '₹6,000/year',
      eligibility: language === 'en' 
        ? ['Small & marginal farmer families', 'Land holding up to 2 hectares', 'Indian citizenship required']
        : ['छोटे और सीमांत किसान परिवार', '2 हेक्टेयर तक भूमि धारण', 'भारतीय नागरिकता आवश्यक'],
      documents: language === 'en'
        ? ['Aadhaar Card', 'Land ownership papers', 'Bank account details', 'Mobile number']
        : ['आधार कार्ड', 'भूमि स्वामित्व पत्र', 'बैंक खाता विवरण', 'मोबाइल नंबर'],
      link: 'https://pmkisan.gov.in/',
      status: 'active'
    },
    {
      name: 'PMFBY',
      description: language === 'en' ? 'Crop insurance scheme protecting farmers against crop loss' : 'फसल हानि के खिलाफ किसानों की सुरक्षा करने वाली फसल बीमा योजना',
      amount: 'Premium: 1.5-5%',
      eligibility: language === 'en'
        ? ['All farmers (landowner/tenant)', 'Notified crops in notified areas', 'Compulsory for loanee farmers']
        : ['सभी किसान (भूमिधारक/किरायेदार)', 'अधिसूचित क्षेत्रों में अधिसूचित फसलें', 'ऋणी किसानों के लिए अनिवार्य'],
      documents: language === 'en'
        ? ['Application form', 'Aadhaar/Voter ID', 'Bank account details', 'Land records', 'Sowing certificate']
        : ['आवेदन फॉर्म', 'आधार/वोटर आईडी', 'बैंक खाता विवरण', 'भूमि रिकॉर्ड', 'बुवाई प्रमाणपत्र'],
      link: 'https://pmfby.gov.in/',
      status: 'active'
    },
    {
      name: 'KCC',
      description: language === 'en' ? 'Credit facility for farmers at subsidized interest rates' : 'सब्सिडी युक्त ब्याज दरों पर किसानों के लिए ऋण सुविधा',
      amount: 'Interest: 4-7%',
      eligibility: language === 'en'
        ? ['Farmers with land ownership', 'Tenant farmers with valid documents', 'SHG members involved in agriculture']
        : ['भूमि स्वामित्व वाले किसान', 'वैध दस्तावेजों वाले किरायेदार किसान', 'कृषि में शामिल एसएचजी सदस्य'],
      documents: language === 'en'
        ? ['KYC documents', 'Land documents', 'Income certificate', 'Crop plan/budget']
        : ['केवाईसी दस्तावेज', 'भूमि दस्तावेज', 'आय प्रमाणपत्र', 'फसल योजना/बजट'],
      link: 'https://www.nabard.org/content1.aspx?id=581',
      status: 'active'
    },
    {
      name: 'PM-KUSUM',
      description: language === 'en' ? 'Solar energy scheme for irrigation and grid feeding' : 'सिंचाई और ग्रिड फीडिंग के लिए सौर ऊर्जा योजना',
      amount: 'Subsidy: 30-60%',
      eligibility: language === 'en'
        ? ['Individual farmers', 'Cooperatives/FPOs', 'Water user associations']
        : ['व्यक्तिगत किसान', 'सहकारी/एफपीओ', 'जल उपयोगकर्ता संघ'],
      documents: language === 'en'
        ? ['Application form', 'Land documents', 'Electricity connection proof', 'Bank guarantee']
        : ['आवेदन फॉर्म', 'भूमि दस्तावेज', 'बिजली कनेक्शन प्रमाण', 'बैंक गारंटी'],
      link: 'https://pmkusum.mnre.gov.in/',
      status: 'active'
    }
  ];

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
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {language === 'en' 
              ? 'Comprehensive list of government schemes with eligibility criteria and application details'
              : 'पात्रता मानदंड और आवेदन विवरण के साथ सरकारी योजनाओं की व्यापक सूची'
            }
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {schemes.map((scheme, index) => (
            <motion.div
              key={scheme.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="glass-card h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl text-foreground">{scheme.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-success border-success">
                        <CheckCircleIcon className="w-3 h-3 mr-1" />
                        {language === 'en' ? 'Active' : 'सक्रिय'}
                      </Badge>
                      <Badge variant="secondary" className="text-primary">
                        <CurrencyRupeeIcon className="w-3 h-3 mr-1" />
                        {scheme.amount}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{scheme.description}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                      <CheckCircleIcon className="w-4 h-4 text-success" />
                      {language === 'en' ? 'Eligibility' : 'पात्रता'}
                    </h4>
                    <ul className="space-y-1">
                      {scheme.eligibility.map((item, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
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
                      {scheme.documents.map((doc, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="w-1 h-1 bg-accent-dark rounded-full mt-2 flex-shrink-0"></span>
                          {doc}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4">
                    <Button asChild className="w-full">
                      <a href={scheme.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
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

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold text-foreground">
                {language === 'en' ? 'Need Help with Applications?' : 'आवेदनों में सहायता चाहिए?'}
              </h3>
              <p className="text-muted-foreground">
                {language === 'en' 
                  ? 'Visit your nearest Common Service Center (CSC) or Krishi Vigyan Kendra (KVK) for assistance'
                  : 'सहायता के लिए अपने निकटतम कॉमन सर्विस सेंटर (CSC) या कृषि विज्ञान केंद्र (KVK) पर जाएं'
                }
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="outline" asChild>
                  <a href="https://www.csc.gov.in/" target="_blank" rel="noopener noreferrer">
                    {language === 'en' ? 'Find CSC Near You' : 'अपने पास CSC खोजें'}
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="https://kvk.icar.gov.in/" target="_blank" rel="noopener noreferrer">
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
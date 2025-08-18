import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  UsersIcon, 
  PlusIcon, 
  ChatBubbleLeftIcon,
  HeartIcon,
  ShareIcon,
  MagnifyingGlassIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from '@/lib/i18n';

const CommunityPage = () => {
  const { t, language } = useTranslation();
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const posts = [
    {
      id: 1,
      author: 'राम कुमार',
      location: 'पंजाब',
      title: language === 'en' ? 'Best practices for wheat farming in Punjab' : 'पंजाब में गेहूं की खेती के लिए सर्वोत्तम प्रथाएं',
      content: language === 'en' 
        ? 'I have been farming wheat for 15 years. Here are some tips that increased my yield by 30%...'
        : 'मैं 15 सालों से गेहूं की खेती कर रहा हूं। यहां कुछ तरकीबें हैं जिनसे मेरी पैदावार 30% बढ़ी...',
      tags: ['wheat', 'punjab', 'tips'],
      likes: 24,
      comments: 8,
      timeAgo: language === 'en' ? '2 hours ago' : '2 घंटे पहले'
    },
    {
      id: 2,
      author: 'सुनीता देवी',
      location: 'हरियाणा',
      title: language === 'en' ? 'Organic pest control methods' : 'जैविक कीट नियंत्रण के तरीके',
      content: language === 'en'
        ? 'Successfully reduced pest damage by 80% using neem oil and companion planting...'
        : 'नीम के तेल और साथी पौधारोपण का उपयोग करके कीट क्षति को 80% तक कम किया...',
      tags: ['organic', 'pest-control', 'sustainable'],
      likes: 18,
      comments: 12,
      timeAgo: language === 'en' ? '4 hours ago' : '4 घंटे पहले'
    },
    {
      id: 3,
      author: 'विजय पटेल',
      location: 'गुजरात',
      title: language === 'en' ? 'Water conservation techniques' : 'जल संरक्षण तकनीकें',
      content: language === 'en'
        ? 'Drip irrigation system helped me save 40% water while increasing crop yield...'
        : 'ड्रिप सिंचाई प्रणाली ने मुझे 40% पानी बचाने में मदद की और फसल की पैदावार बढ़ाई...',
      tags: ['water-conservation', 'drip-irrigation', 'efficiency'],
      likes: 31,
      comments: 15,
      timeAgo: language === 'en' ? '1 day ago' : '1 दिन पहले'
    }
  ];

  const popularTags = ['wheat', 'organic', 'pest-control', 'irrigation', 'fertilizers', 'seeds'];

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold mb-2 text-foreground flex items-center justify-center gap-2">
            <UsersIcon className="w-6 h-6 md:w-8 md:h-8 text-accent-dark" />
            {t('communityForum')}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            {language === 'en' 
              ? 'Connect, share knowledge, and learn from fellow farmers'
              : 'जुड़ें, ज्ञान साझा करें, और साथी किसानों से सीखें'
            }
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Search and Create Post */}
            <Card className="glass-card">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder={language === 'en' ? 'Search posts...' : 'पोस्ट खोजें...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button 
                    onClick={() => setShowCreatePost(!showCreatePost)}
                    className="flex items-center gap-2 whitespace-nowrap"
                  >
                    <PlusIcon className="w-4 h-4" />
                    {language === 'en' ? 'Create Post' : 'पोस्ट बनाएं'}
                  </Button>
                </div>

                {/* Create Post Form */}
                {showCreatePost && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-6 pt-6 border-t border-border space-y-4"
                  >
                    <Input 
                      placeholder={language === 'en' ? 'Post title...' : 'पोस्ट का शीर्षक...'}
                    />
                    <Textarea 
                      placeholder={language === 'en' ? 'Share your farming experience, tips, or questions...' : 'अपनी खेती का अनुभव, सुझाव या प्रश्न साझा करें...'}
                      rows={4}
                    />
                    <Input 
                      placeholder={language === 'en' ? 'Tags (comma-separated)' : 'टैग (कॉमा से अलग करें)'}
                    />
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button className="flex-1">
                        {language === 'en' ? 'Post' : 'पोस्ट करें'}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowCreatePost(false)}
                        className="flex-1 sm:flex-none"
                      >
                        {language === 'en' ? 'Cancel' : 'रद्द करें'}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>

            {/* Posts */}
            <div className="space-y-6">
              {posts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="glass-card">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <Avatar className="w-10 h-10 flex-shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {post.author.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                            <h3 className="font-semibold text-foreground">{post.author}</h3>
                            <span className="text-sm text-muted-foreground">• {post.location}</span>
                            <span className="text-sm text-muted-foreground">• {post.timeAgo}</span>
                          </div>
                          
                          <h4 className="text-lg font-medium text-foreground mb-2 break-words">
                            {post.title}
                          </h4>
                          
                          <p className="text-muted-foreground mb-4 break-words">
                            {post.content}
                          </p>
                          
                          <div className="flex flex-wrap gap-2 mb-4">
                            {post.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                <TagIcon className="w-3 h-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-4">
                            <Button variant="ghost" size="sm" className="flex items-center gap-2">
                              <HeartIcon className="w-4 h-4" />
                              {post.likes}
                            </Button>
                            <Button variant="ghost" size="sm" className="flex items-center gap-2">
                              <ChatBubbleLeftIcon className="w-4 h-4" />
                              {post.comments}
                            </Button>
                            <Button variant="ghost" size="sm" className="flex items-center gap-2">
                              <ShareIcon className="w-4 h-4" />
                              {language === 'en' ? 'Share' : 'साझा करें'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Popular Tags */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">
                  {language === 'en' ? 'Popular Tags' : 'लोकप्रिय टैग'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {popularTags.map((tag) => (
                  <Badge 
                    key={tag} 
                    variant="outline" 
                    className="cursor-pointer hover:bg-primary/10 mr-2 mb-2"
                  >
                    <TagIcon className="w-3 h-3 mr-1" />
                    #{tag}
                  </Badge>
                ))}
              </CardContent>
            </Card>

            {/* Community Stats */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">
                  {language === 'en' ? 'Community Stats' : 'समुदाय आंकड़े'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">1,247</div>
                  <div className="text-sm text-muted-foreground">
                    {language === 'en' ? 'Active Members' : 'सक्रिय सदस्य'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-success">856</div>
                  <div className="text-sm text-muted-foreground">
                    {language === 'en' ? 'Posts This Month' : 'इस महीने पोस्ट'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent-dark">95%</div>
                  <div className="text-sm text-muted-foreground">
                    {language === 'en' ? 'Helpful Responses' : 'सहायक प्रतिक्रियाएं'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CommunityPage;
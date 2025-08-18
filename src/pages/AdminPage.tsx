import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '@/lib/i18n';

const AdminPage = () => {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2 text-foreground flex items-center justify-center gap-2">
            <ShieldCheckIcon className="w-8 h-8 text-destructive" />
            {t('admin')}
          </h1>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Admin Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Content moderation and system management</p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AdminPage;
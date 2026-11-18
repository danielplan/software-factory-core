import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';
import { useItems } from '@/api/use-items';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { MessageScreen } from '@/components/message-screen';
import { PageHeading } from '@/components/page-heading';
import { Screen } from '@/components/screen';
import { useErrorText } from '@/hooks/use-error-text';
import { makeStyles } from '@/theme/make-styles';
import { type } from '@/theme/tokens';
import { ItemList } from './item-list';

/**
 * The starter's only screen: what the app is, and the made-up items the
 * backend gives (GET /api/items), or a message when there are none.
 */
export function HomeScreen() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const items = useItems();
  const s = useStyles();
  if (items.isPending) return <MessageScreen loading message={t('loading')} />;
  if (items.isError)
    return (
      <MessageScreen message={errorText(items.error)}>
        <Button
          onPress={() => {
            void items.refetch();
          }}
        >
          {t('retry')}
        </Button>
      </MessageScreen>
    );
  return (
    <Screen>
      <PageHeading eyebrow={t('home:eyebrow')} title={t('home:title')} />
      <Card>
        <Text style={s.intro}>{t('home:intro')}</Text>
      </Card>
      <ItemList items={items.data} />
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  intro: { ...type.body, color: colors.text },
}));

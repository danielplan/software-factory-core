import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import type { Item } from '@/api/items.schema';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { makeStyles } from '@/theme/make-styles';
import { space, type } from '@/theme/tokens';

/** The items, one row each, or a message when there are none. */
export function ItemList({ items }: Readonly<{ items: readonly Item[] }>) {
  const { t } = useTranslation();
  const s = useStyles();
  if (items.length === 0)
    return (
      <EmptyState
        title={t('home:empty.title')}
        subtitle={t('home:empty.subtitle')}
      />
    );
  return (
    <Card>
      <Text accessibilityRole="header" style={s.title}>
        {t('home:itemsTitle')}
      </Text>
      {items.map((item) => (
        <View key={item.id} style={s.row}>
          <Text style={s.name}>{item.name}</Text>
          {item.note ? <Text style={s.note}>{item.note}</Text> : null}
        </View>
      ))}
    </Card>
  );
}

const useStyles = makeStyles((colors) => ({
  title: { ...type.cardTitle, color: colors.text },
  row: {
    paddingVertical: space.s,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    gap: space.xs,
  },
  name: { ...type.label, color: colors.text },
  note: { ...type.small, color: colors.muted },
}));

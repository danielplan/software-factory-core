import { Text, View } from 'react-native';
import { makeStyles } from '@/theme/make-styles';
import { radius, space, type } from '@/theme/tokens';

/** What a list or a screen says when there is nothing to show. */
export function EmptyState({
  title,
  subtitle,
}: Readonly<{
  title: string;
  subtitle?: string;
}>) {
  const s = useStyles();
  return (
    <View style={s.empty}>
      <Text style={s.title}>{title}</Text>
      {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  empty: {
    alignItems: 'center',
    padding: space.xxl,
    gap: 9,
    backgroundColor: colors.surface,
    borderRadius: radius.l,
    marginVertical: space.m,
  },
  title: { ...type.cardTitle, color: colors.text, textAlign: 'center' },
  subtitle: { ...type.small, color: colors.muted, textAlign: 'center' },
}));

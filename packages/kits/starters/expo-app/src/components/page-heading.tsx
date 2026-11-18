import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { makeStyles } from '@/theme/make-styles';
import { space, type } from '@/theme/tokens';

/** A screen's big name, with an eyebrow above and an action beside it. */
export function PageHeading({
  title,
  eyebrow,
  action,
}: Readonly<{
  title: string;
  eyebrow?: string;
  action?: ReactNode;
}>) {
  const s = useStyles();
  return (
    <View style={s.row}>
      <View style={s.text}>
        {eyebrow ? <Text style={s.eyebrow}>{eyebrow}</Text> : null}
        <Text accessibilityRole="header" style={s.title}>
          {title}
        </Text>
      </View>
      {action}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.xl,
    gap: space.m,
  },
  text: { flex: 1 },
  eyebrow: { ...type.eyebrow, color: colors.muted, marginBottom: 6 },
  title: { ...type.hero, color: colors.text },
}));

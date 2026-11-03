/*
 * ADD-04 Phase E — Standard component set (§5) ที่ render จาก VariantStyle
 * ใช้ภายใน <StyleResolverProvider resolver={(c) => VariantStyle}> เสมอ
 */
export {
  StyleResolverProvider,
  StdStyleOverride,
  useStdStyle,
  useSiteTheme,
  preventMockNavigation,
  type StyleResolver,
  type SiteTheme,
} from "./style-context";
export {
  StdButton,
  StdInput,
  StdBadge,
  statusTone,
  cssVars,
  type StdButtonProps,
  type StdButtonVariant,
  type StdInputProps,
  type StdInputType,
  type StdInputOption,
  type StdBadgeProps,
  type StdTone,
} from "./controls";
export {
  SITE_CONTAINER,
  StdCard,
  StdInset,
  StdNav,
  StdSideNav,
  StdTable,
  StdFooter,
  type StdCardProps,
  type StdNavLink,
  type StdNavProps,
  type StdSideNavProps,
  type StdTableColumn,
  type StdTableProps,
  type StdFooterColumn,
  type StdFooterProps,
} from "./structure";
export {
  StdBrand,
  StdAvatar,
  StdStatCard,
  StdProgress,
  StdAlert,
  StdSegmented,
  StdBreadcrumb,
  StdBarChart,
  StdStackedBar,
  type StdStatCardProps,
  type StdProgressProps,
  type StdAlertProps,
  type StdSegmentedProps,
  type StdBarChartProps,
  type StdStackedSegment,
} from "./widgets";

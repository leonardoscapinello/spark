// packages/ui-web — design system web. Único lugar do repositório onde um
// elemento HTML nativo de formulário pode ser escrito (ADR-0020). Verificado
// por lint em todo o resto do monorepo.
import "./identidade.css";
export * from "./Glass/Glass.js";
export * from "./Button/Button.js";
export * from "./Input/Input.js";
export * from "./Field/Field.js";
export * from "./Label/Label.js";
export * from "./ErrorText/ErrorText.js";
export * from "./Icon/Icon.js";
export * from "./PasswordInput/PasswordInput.js";
export * from "./Form/Form.js";
export * from "./Tabs/Tabs.js";
export * from "./TagPicker/TagPicker.js";
export * from "./Accordion/Accordion.js";
export * from "./Sidebar/Sidebar.js";
export * from "./Menu/Menu.js";
export * from "./Select/Select.js";
export * from "./SearchSelect/SearchSelect.js";
export * from "./Popover/Popover.js";
export * from "./Modal/Modal.js";
export * from "./Tooltip/Tooltip.js";
export * from "./Checkbox/Checkbox.js";
export * from "./Switch/Switch.js";
export * from "./RadioGroup/RadioGroup.js";
export * from "./Textarea/Textarea.js";
export * from "./Feedback/Feedback.js";
export * from "./Card/Card.js";
export * from "./RecordIdentity/RecordIdentity.js";
export { SettingsSection } from "./SettingsSection/SettingsSection.js";
export * from "./Dashboard/Dashboard.js";
export * from "./Chart/Chart.js";

export { InlineEdit, type InlineEditProps } from "./InlineEdit/InlineEdit.js";

export { ModalColumns, ModalColumn } from "./Modal/Modal.js";
export { ActionModal } from "./Modal/ActionModal.js";
export { Notification, NotificationList, type NotificationProps, type NotificationEntry } from "./Notification/Notification.js";
export { Toaster, notify, dismissNotification } from "./Notification/Toast.js";
export { DealOutcomeCelebration, celebrateDealOutcome, type DealOutcome } from "./DealOutcome/DealOutcome.js";

export { CompanyRegistrationCard, type CompanyRegistrationCardProps } from "./CompanyRegistration/CompanyRegistration.js";
export { CompanyRegistrationDetails, type CompanyRegistrationDetailsProps } from "./CompanyRegistration/CompanyRegistrationDetails.js";
export { DocumentInput, MaskedInput, MoneyInput, PercentInput, PhoneInput, type MaskedInputProps, type PhoneCountry, type PhoneDraft } from "./MaskedInput/MaskedInput.js";
export { ColorPicker, CRM_COLOR_OPTIONS, type CrmColorOption } from "./ColorPicker/ColorPicker.js";

export { Panel, PanelTrigger, PanelClose, PanelContent, type PanelSide, type PanelContentProps } from "./Panel/Panel.js";

export { FormField, type FormFieldProps, type FormFieldLayout } from "./FormField/FormField.js";

export { DatePicker, TimePicker, DateTimePicker, type DateTimePickerProps, type DateTimeMode } from "./DateTimePicker/DateTimePicker.js";
export { ProgressComparison, type ProgressMeasure } from "./ProgressComparison/ProgressComparison.js";

export { ChangeCalculator, type ChangeCalculatorProps } from "./ChangeCalculator/ChangeCalculator.js";

export { DataTable, type DataTableProps, type TableColumn } from "./DataTable/DataTable.js";
export { FilterBar, type FilterBarProps, type FilterCondition, type FilterFieldDefinition } from "./FilterBar/FilterBar.js";

export { TableActions, TableIconAction, type TableIconActionProps } from "./DataTable/TableActions.js";

export { FeedbackButton, type FeedbackButtonProps, type FeedbackState } from "./Button/FeedbackButton.js";

export { CashPiece, type CashPieceProps } from "./ChangeCalculator/CashPiece.js";
export { PageHeader, type PageHeaderProps } from "./PageHeader/PageHeader.js";
export { BackLink, type BackLinkProps } from "./BackLink/BackLink.js";
export { PublicationStatus, type PublicationStatusProps } from "./PublicationStatus/PublicationStatus.js";
export { PageFrame, type PageFrameProps } from "./PageFrame/PageFrame.js";
export { CollectionToolbar, type CollectionToolbarProps } from "./CollectionToolbar/CollectionToolbar.js";
export { RecordHero, RecordPageHeader, type RecordHeroProps, type RecordMetric } from "./RecordHero/RecordHero.js";
export { EmptyState, type EmptyStateProps } from "./EmptyState/EmptyState.js";
export { ViewSwitcher, type ViewSwitcherProps, type ViewMode } from "./ViewSwitcher/ViewSwitcher.js";
export { SegmentedControl, type SegmentedControlProps, type SegmentedOption } from "./SegmentedControl/SegmentedControl.js";
export { CalendarMonth, type CalendarMonthProps, type CalendarMonthItem } from "./CalendarMonth/CalendarMonth.js";
export { CalendarWeek, type CalendarWeekProps, type CalendarWeekItem } from "./CalendarWeek/CalendarWeek.js";
export { Avatar, type AvatarProps } from "./Avatar/Avatar.js";
export { AvatarStack } from "./Avatar/AvatarStack.js";
export { UserAvatar, userSelectOption, type UserAvatarProps } from "./UserAvatar/UserAvatar.js";
export { PersonChoice, type PersonChoiceProps } from "./PersonChoice/PersonChoice.js";
export { RecordSelect, type RecordSelectProps } from "./RecordSelect/RecordSelect.js";
export { QuickNavigation, type QuickNavigationProps, type QuickNavigationItem } from "./QuickNavigation/QuickNavigation.js";
export { Timeline, type TimelineItem, type TimelineActor, type TimelineChange } from "./Timeline/Timeline.js";
export { FilePicker, type FilePickerProps } from "./FilePicker/FilePicker.js";
export { LeadFormRenderer, type LeadFormRendererProps } from "./LeadForm/LeadForm.js";
export * from "./StageProgress/StageProgress.js";
export * from "./CustomFieldValue/CustomFieldValue.js";
export * from "./InlineField/InlineField.js";
export * from "./Composer/Composer.js";
export * from "./LinkPreview/LinkPreview.js";
export * from "./ViewerStack/ViewerStack.js";
export * from "./SlaProgress/SlaProgress.js";

export * from "./CrmWorkspace/CrmWorkspace.js";

// Física da identidade para telas que compõem os próprios controles (ADR-0044).
export { useSlidingIndicator } from "./motion/useSlidingIndicator.js";
export { useLabelMorph } from "./motion/useLabelMorph.js";
export { prefersReducedMotion, useReducedMotion } from "./motion/useReducedMotion.js";
export { Surface, type SurfaceProps, type SurfaceElevation, type SurfaceRadius } from "./Surface/Surface.js";
export { SectionTitle } from "./SectionTitle/SectionTitle.js";
export { LinkTabs, type LinkTab } from "./LinkTabs/LinkTabs.js";
// Listas, painéis e acesso na identidade (ADR-0044/0045): busca, texto, disco de ícone, identidade de linha, KPI, estados de página, acesso e aparência.
export * from "./Chip/Chip.js";
export * from "./SearchField/SearchField.js";
export * from "./Text/Text.js";
export { AmountSummary, type AmountSummaryProps } from "./AmountSummary/AmountSummary.js";
export * from "./IconTile/IconTile.js";
export * from "./PersonIdentity/PersonIdentity.js";
export * from "./EmptyState/EmptyState.js";
export * from "./SettingsSection/SettingsSection.js";
export * from "./AuthCard/AuthCard.js";
export * from "./ColorPicker/ColorPicker.js";
export * from "./ThemePreview/ThemePreview.js";
// Construtores (automação, formulário, página): mesa do fluxo, painel lateral, barra flutuante e linha de escolha.
export * from "./Flow/Flow.js";
export * from "./SidePanel/SidePanel.js";
export * from "./Toolbar/Toolbar.js";
export * from "./ListRowButton/ListRowButton.js";
export { ListRow, RowList, type ListRowProps } from "./ListRow/ListRow.js";
export { Signal, type SignalProps, type SignalTone } from "./Signal/Signal.js";
// CRM (ADR-0044/0045): lista de escolhas, responsável, kanban com pouso e compromisso no calendário.
export { ActionList, type ActionListItem, type ActionListProps } from "./ActionList/ActionList.js";
export { OwnerPicker, type OwnerPickerPerson, type OwnerPickerProps } from "./OwnerPicker/OwnerPicker.js";
export { KanbanBoard, KanbanColumn, KanbanCard, KanbanCardContent, KanbanPlaceholder, KanbanGhost, KanbanAddButton, KanbanSkeleton, KanbanDropBar, KanbanDropZone, type KanbanColumnProps, type KanbanCardProps, type KanbanCardContentProps } from "./Kanban/Kanban.js";
export { useKanbanDrag, type KanbanDragState } from "./Kanban/useKanbanDrag.js";
export { CalendarEntry, type CalendarEntryProps } from "./CalendarEntry/CalendarEntry.js";
export { landFrom, growIn, ghostTransform, type LandingOrigin } from "./motion/land.js";
// Atendimento (ADR-0044/0045): lista densa de conversas, canal da pessoa, conversa, campo de resposta e chat do site.
export { ConversationList, ConversationRow, ConversationListHeader, type ConversationListProps, type ConversationRowProps, type ConversationRowChannel, type ConversationListHeaderProps, type ConversationListLayout } from "./ConversationList/ConversationList.js";
export { ChannelChip, channelGlyph, type ChannelChipProps, type ChannelKind } from "./ChannelChip/ChannelChip.js";
export { ChatThread, ChatDay, ChatTyping, ChatAttachment, MessageBubble, MessageReceipt, ConversationHeader, messageStatusLabel, type ChatThreadProps, type MessageBubbleProps, type MessageDirection, type MessageStatus, type ChatAttachmentState, type ConversationHeaderProps } from "./Chat/Chat.js";
export { ChatLauncher, ChatWindow, ChatInput, type ChatWindowProps, type ChatInputProps } from "./ChatWidget/ChatWidget.js";
export { ReplyComposer, ReplyComposerPreview, type ReplyComposerProps, type ReplyComposerMode } from "./Composer/ReplyComposer.js";
export { NoteCard, type NoteCardProps } from "./NoteCard/NoteCard.js";
export { LinkRecordsPreview, type LinkRecordsPreviewProps } from "./LinkRecordsPreview/LinkRecordsPreview.js";
export { AppShell, AppContent } from "./AppShell/AppShell.js";

export { ScoreGauge, type ScoreGaugeProps } from "./ScoreGauge/ScoreGauge.js";

export { CollectionHeader } from "./CollectionHeader/CollectionHeader.js";

export { RecordWorkspace } from "./RecordWorkspace/RecordWorkspace.js";

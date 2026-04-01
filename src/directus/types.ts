export interface BlockTeam {
  id: string;
  title?: string;
  team?: Team[];
  translations?: BlockTeamTranslation[];
}

export interface BlockTeamTranslation {
  id: string;
  languages_code: string;
  title?: string;
  block_team_id?: BlockTeam;
}

export interface Team {
  id: string;
  sort?: number;
  full_name?: string;
  position?: string;
  image?: DirectusFile;
  site_id?: Sites;
  block_team_id?: BlockTeam;
  translations?: TeamTranslation[];
  status?: 'draft' | 'published';
  bio?: string;
  date_created?: string;
  date_updated?: string;
  job_title?: string;
  name?: string;
  social_media?: SocialLink[];
  user_created?: string | DirectusUsers;
  user_updated?: string | DirectusUsers;
}

export interface TeamTranslation {
  id: string;
  languages_code: string;
  full_name?: string;
  position?: string;
  team_id?: Team;
}

export interface EventBasicInfo {
  id: number;
  name?: string;
  start_date?: string | null;
  end_date?: string | null;
  location?: string | null;
}

export interface SiteTranslation {
  id?: string | number;
  languages_code: string;
  title?: string;
  description?: string;
}

export interface Sites {
  id: string;
  name?: string;
  slug?: string;
  favicon?: DirectusFile;
  logo?: DirectusFile;
  domain?: string;
  domain_verified?: boolean;
  status?: 'draft' | 'published';
  navigation?: string[];
  event_id?: number | null;
  event?: EventBasicInfo | null;
  translations?: SiteTranslation[];
  languages?: Array<{
    code: string;
    name: string;
    direction: string;
  }>;
}

// --- Event data types ---

export interface ExhibitorTranslation {
  languages_code: string;
  company_name?: string;
  company_description?: string;
}

export interface Exhibitor {
  id: string;
  status?: string;
  logo?: string | null;
  website?: string | null;
  translations?: ExhibitorTranslation[];
}

export interface IndustryTranslation {
  languages_code: string;
  category?: string;
}

export interface ExhibitorEvent {
  id: string;
  booth_number?: string | null;
  nameboard?: string | null;
  is_featured?: boolean;
  exhibitor_id?: Exhibitor | null;
  industry_translations?: IndustryTranslation[];
}

export interface SpeakerTranslation {
  languages_code: string;
  bio?: string | null;
  name?: string | null;
  title?: string | null;
  company?: string | null;
}

export interface Speaker {
  id: string;
  status?: string;
  sort?: number;
  name: string;
  position?: string | null;
  company?: string | null;
  photo?: string | null;
  bio?: string | null;
  linkedin_url?: string | null;
  social_links?: Array<{ platform: string; url: string }> | null;
  translations?: SpeakerTranslation[];
}

export interface AgendaTrack {
  id: string;
  track_slug?: string;
  default_name?: string;
  track_color?: string | null;
  translations?: Array<{ languages_code: string; name?: string }>;
}

export interface AgendaTranslation {
  languages_code: string;
  title?: string;
  description?: string | null;
}

// M2M junction record: agendas_speakers → speakers
export interface AgendaSpeakerJunction {
  speakers_id?: {
    id: string;
    name: string;
    photo?: string | null;
    avatar?: string | null;
  } | null;
}

export interface AgendaSession {
  id: string;
  status?: string;
  date?: string | null;
  day_number?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  session_type?: string | null;
  is_featured?: boolean;
  track_id?: string | null;         // returned as UUID string
  speakers?: AgendaSpeakerJunction[];
  translations?: AgendaTranslation[];
}

export interface Page {
  id: string;
  status: 'published' | 'draft' | 'archived';
  site_id: string;
  title?: string;
  template?: string;
  blocks?: Block[];
  slug?: string;
  translations: PagesTranslations[];
}

export interface PagesTranslations {
  id: string;
  languages_code: string;
  title?: string;
  permalink: string;
  blocks: Array<{
    id: string;
    collection: string;
    item: string;
    sort: number;
  }>;
}

export interface NavigationItem {
  id: string
  type?: string
  url?: string
  page?: {
    id: string
    translations: {
      languages_code: string
      permalink: string
    }[]
  }
  translations: {
    languages_code: string
    title: string
  }[]
  href?: string
  sort?: number
}

export interface Navigation {
  id: string
  status?: 'draft' | 'published'
  type?: string
  items: NavigationItem[]
}

export interface NavLink {
  id: string;
  title?: string;
  url?: string;
  navigation_id?: Navigation;
}

export interface DirectusFile {
  id: string;
  title?: string;
  filename_download?: string;
  type?: string;
  filesize?: number;
  width?: number;
  height?: number;
  folder?: string;
}

// Page Builder Block Types
export type Block =
  | BlockHero
  | BlockText
  | BlockTeamBlock
  | BlockImage
  | BlockFeature
  | BlockSpacer;

export interface BlockBase {
  id: string;
  collection: string;
}

export interface BlockHero extends BlockBase {
  collection: 'block_hero';
  item: {
    id: string;
    title: string;
    subtitle?: string;
    background_image?: DirectusFile;
  };
}

export interface BlockText extends BlockBase {
  collection: 'block_text';
  item: {
    id: string;
    content: string;
  };
}

export interface BlockTeamBlock extends BlockBase {
  collection: 'block_team';
  item: {
    id: string;
    title?: string;
    team?: Team[];
  };
}

export interface BlockImage extends BlockBase {
  collection: 'block_image';
  item: {
    id: string;
    image?: DirectusFile;
    caption?: string;
  };
}

export interface BlockFeature extends BlockBase {
  collection: 'block_feature';
  item: {
    id: string;
    features: string[];
  };
}

export interface BlockSpacer extends BlockBase {
  collection: 'block_spacer';
  item: {
    id: string;
    height: number;
  };
}

export interface DirectusUsers {
  auth_data?: unknown
  avatar?: string | DirectusFile
  description?: string
  email?: string
  email_notifications?: boolean
  external_identifier?: string
  first_name?: string
  id: string
  language?: string
  last_access?: string
  last_name?: string
  last_page?: string
  location?: string
  password?: string
  provider: string
  role?: string
  status: string
  tags?: unknown
  tfa_secret?: string
  theme?: string
  title?: string
  token?: string
}

export interface Forms {
  id: string;
  status: 'published' | 'draft' | 'archived';
  on_success?: 'redirect' | 'message';
  redirect_url?: string;
  tenant_id?: number;
  event_id?: number;
  site_id?: number;
  submit_label?: string;
  success_message?: string;
  fields?: FormField[];
  translations?: FormTranslation[];
  schema?: FormField[];
  is_allow_group?: boolean;
  template_email?: string;
  template_email_group?: string;
  qr_code_field?: string;
}

export interface FormField {
  id: string;
  form_id?: string;
  name: string;
  type: 'input' | 'textarea' | 'select' | 'email' | 'number' | 'multiselect' | 'file' | 'image' | 'date' | 'datetime';
  width?: string;
  validation?: string;
  conditions?: any;
  translations?: FormFieldTranslation[];
  $formkit?: string;
  outerclass?: string;
  options?: Array<{ label: string; value: string }>;
  label?: string;
  is_required?: boolean;
  is_group_field?: boolean;
  is_email_contact?: boolean;
  is_name_field?: boolean;
  is_phone_field?: boolean;
  event_id?: number;
  tenant_id?: number;
}

export interface FormTranslation {
  languages_code: string;
  title?: string;
  submit_label?: string;
  success_message?: string;
}

export interface FormFieldTranslation {
  languages_code: string;
  label?: string;
  placeholder?: string;
  help?: string;
  options?: any;
}

export interface Posts {
  author?: string | DirectusUsers
  category?: Categories
  date_created?: string
  date_published?: string
  date_updated?: string
  id: string
  image?: string | DirectusFile
  seo?: Seo
  slug?: string
  sort?: number
  status: string
  translations?: PostsTranslations[]
  user_created?: string
  user_updated?: string
}

export interface PostsTranslations {
  content: string
  id: number
  languages_code?: string
  posts_id?: string | Posts
  summary?: string
  title?: string
}

export interface Projects {
  id: string;
  slug?: string;
  date_updated?: string;
  // Bổ sung các field khác nếu cần
}
export interface Categories {
  color?: string
  content?: string
  id: string
  seo?: Seo
  slug?: string
  sort?: number
  title?: string
  translations?: CategoriesTranslations[]
}

export interface CategoriesTranslations {
  id: string
  categories_id: string
  languages_code: string
  title?: string
  content?: string
  slug?: string
}

export interface Seo {
  canonical_url?: string
  id: string
  meta_description?: string
  no_follow?: boolean
  no_index?: boolean
  og_image?: string | DirectusFile
  sitemap_change_frequency?: string
  sitemap_priority?: number
  title?: string
}

export interface HelpFeedback {
  comments?: string
  date_created?: string
  date_updated?: string
  id: string
  rating?: number
  title?: string
  url?: string
  user_created?: string | DirectusUsers
  user_updated?: string | DirectusUsers
  visitor_id?: string
}

export interface FormSubmissions {
  id: string
  answers: Array<{
    field: string
    value: string
  }>
  form: string | Forms
  date_created?: string
  date_updated?: string
  user_created?: string | DirectusUsers
  user_updated?: string | DirectusUsers
  status?: 'draft' | 'published' | 'archived'
  is_lead?: boolean
  date_started?: string
  date_sumitted?: string
  group_id?: string
}

export interface BlockColumns {
  headline?: string
  id: string
  rows?: BlockColumnsRows[]
  title?: string
}

export interface BlockColumnsRows {
  block_columns?: string | BlockColumns
  content?: string
  headline?: string
  id: number
  image?: DirectusFile | string
  image_position?: string
  title?: string
}

export interface BlockSteps {
  alternate_image_position: boolean
  headline?: string
  id: string
  show_step_numbers?: boolean
  steps?: BlockStepsItems[]
  title?: string
}

export interface BlockStepsItems {
  block_steps?: string | BlockSteps
  content?: string
  id: number
  image?: string | DirectusFile
  sort?: number
  title?: string
  translations?: {
    languages_code: string
    title: string
    content: string
  }[]
}

export interface BlockTeam {
  content?: string
  headline?: string
  id: string
  title?: string
}

export interface Globals {
  id: string
  status: 'published' | 'draft' | 'archived'
  date_created?: string
  date_updated?: string
  user_created?: string
  user_updated?: string
  site_id?: string
  translations?: GlobalsTranslations[]
}

export interface GlobalsTranslations {
  id: number
  languages_code?: string
  globals_id?: string
  title: string
  tagline?: string
  description: string
  contact: string
  phone?: string
  email?: string
  address_country?: string
  address_region?: string
  address_locality?: string
  postal_code?: string
  street_address?: string
  og_image?: string | DirectusFile
  social_links?: SocialLink[]
  blog_setting: BlogSettings
  project_setting: ProjectsSettings
  seo: string
  setting: string
  social: string
  deployment: string
  build_hook_url?: string
  routes?: unknown
  theme?: {
    primary?: string
    gray?: string
    borderRadius?: string
    fonts?: {
      families?: {
        display?: string
        body?: string
        code?: string
      }
    }
  }
}

export interface BlogSettings {
  featured_post?: string | Posts
  headline?: string
  id: string
  posts_per_page?: number
  seo?: Seo
  title?: string
}

export interface ProjectsSettings {
  headline?: string
  id: string
  seo?: Seo
  title?: string
}

export interface SocialLink {
  platform: string
  url: string
}

export interface NavigationItems {
  id: string
  type: 'page' | 'url'
  url?: string
  page?: {
    id: string
    translations: {
      languages_code: string
      permalink: string
    }[]
  }
  translations: {
    languages_code: string
    title: string
  }[]
  href?: string
  sort?: number
  icon?: string
  has_children?: boolean
  open_in_new_tab?: boolean
  label?: string
}

export interface DirectusFiles {
  charset?: string
  description?: string
  duration?: number
  embed?: string
  filename_disk?: string
  filename_download: string
  filesize?: number
  folder?: string
  height?: number
  id: string
  location?: string
  metadata?: unknown
  modified_by?: string | DirectusUsers
  modified_on: string
  storage: string
  tags?: string[]
  title?: string
  type?: string
  uploaded_by?: string | DirectusUsers
  uploaded_on: string
  width?: number
}

export interface Pages {
  id: string;
  status: 'published' | 'draft' | 'archived';
  site_id: string;
  title: string;
  translations: PagesTranslations[];
}

export interface PagesSitemap {
  slug: string;
  date_updated: string;
  translations?: {
    languages_code: string;
  }[];
}

export interface PostsSitemap {
  slug: string;
  date_updated: string;
  translations?: {
    languages_code: string;
  }[];
}

export interface ProjectsSitemap {
  slug: string;
  date_updated: string;
}

export interface ProjectsTranslations {
  id: number;
  languages_code?: string;
  projects_id?: string;
  title?: string;
  summary?: string;
  content?: string;
}

// types/directus-types.ts

export interface FormSchema {
  name: string
  type: 'input' | 'textarea' | 'select'
  label: string
  placeholder?: string
  help?: string
  validation?: string
  width?: string | number
  options?: Array<{ label: string; value: string }>
  outerclass?: string
  $formkit?: string
}

export interface HelpArticles {
  id: string
  status: 'published' | 'draft' | 'archived'
  title: string
  slug: string
  content?: string
  category?: string | HelpCollections
  date_created?: string
  date_updated?: string
  user_created?: string
  user_updated?: string
  translations?: HelpArticlesTranslations[]
}

export interface HelpArticlesTranslations {
  id: string
  languages_code?: string
  title?: string
  content?: string
  help_articles_id?: string
}

export interface HelpCollections {
  id: string
  status: 'published' | 'draft' | 'archived'
  name: string
  description?: string
  icon?: string
  translations?: HelpCollectionsTranslations[]
  sort?: number
}

export interface HelpCollectionsTranslations {
  id: number
  help_collections_id: string
  languages_code: string
  name?: string
  description?: string
}

export interface CustomDirectusTypes {
  sites: Sites
  globals: Globals
  navigation: Navigation
  pages: Pages
  posts: Posts
  forms: Forms
  help_articles: HelpArticles
  help_collections: HelpCollections
  help_feedback: HelpFeedback
  categories: Categories
  form_submissions: any
  projects: any
}

# Sub3VT Marathon Training App - Design Guidelines

## Design Approach

**System Selected**: Material Design with Linear-inspired data visualization
**Rationale**: Data-driven fitness applications require clarity, hierarchy, and strong visual feedback. Material Design provides robust patterns for dashboards and data displays, while Linear's clean aesthetic ensures the interface feels modern and performance-oriented.

## Typography System

**Font Stack**: Inter (via Google Fonts)
- **Headings**: Semi-bold (600) for page titles and section headers
- **Body**: Regular (400) for content, descriptions
- **Data/Metrics**: Bold (700) for numbers and key statistics
- **Labels**: Medium (500) for form labels and micro-copy

**Size Hierarchy**:
- Hero metrics: text-5xl to text-6xl
- Page titles: text-3xl to text-4xl
- Section headers: text-xl to text-2xl
- Body text: text-base
- Captions/labels: text-sm

## Layout System

**Spacing Units**: Tailwind units of 3, 4, 6, 8, 12, 16
- Component padding: p-4 to p-6
- Section spacing: py-12 to py-16
- Card gaps: gap-4 to gap-6
- Page margins: px-4 md:px-8 lg:px-12

**Container Strategy**:
- Dashboard max-width: max-w-7xl
- Content sections: max-w-6xl
- Forms/settings: max-w-2xl
- Full-width data visualizations where appropriate

## Component Library

### Dashboard Components

**Stats Cards**: 
- Large metric display with icon, label below
- Grid layout: 2 columns mobile, 4 columns desktop
- Includes: Days Until Race, Weekly Mileage, Total Runs, Average Pace
- Shadow elevation for depth

**Progress Rings/Bars**:
- Circular progress for weekly mileage goals
- Linear bars for training phase completion
- Percentage indicators prominently displayed

**Activity Feed**:
- Chronological list of recent workouts
- Each item: date, workout type, distance, pace, duration
- Subtle dividers between entries

### Calendar View

**Layout**: Full-width monthly grid with large date cells
**Cell Content**: 
- Workout type badge/pill at top
- Distance and pace below
- Rest days clearly distinguished
- Future planned workouts use muted styling

**Week View Toggle**: Optional linear week view for detailed planning

### Training Plan Components

**Plan Cards**:
- Week-by-week accordion structure
- Each week shows: total mileage, key workouts, intensity breakdown
- Expandable for daily detail

**Workout Detail Blocks**:
- Workout type with icon
- Target pace zones
- Distance/duration
- Notes section for coach guidance

### Navigation

**Primary Nav**: 
- Sidebar on desktop (w-64), collapsible
- Bottom navigation on mobile (fixed)
- Icons + labels for: Dashboard, Calendar, Plans, Progress, Settings

**Header**:
- App logo/name left
- Race countdown center (desktop)
- Profile/settings right
- Subtle border-bottom separator

### Forms & Settings

**Input Fields**:
- Floating labels pattern
- Clear focus states with border emphasis
- Helper text below for guidance
- Group related settings in cards

**Toggle Switches**: For preferences (units, notifications)
**Dropdowns**: For race selection, plan customization

## Images

**Hero Image**: No traditional hero section - this is a utility app
**Dashboard Welcome Banner**: 
- Horizontal banner image showing runner in motion (abstract/blurred for energy)
- Overlaid with greeting text and race countdown
- Height: 200-300px, full-width
- Blurred background buttons if CTAs needed

**Empty States**:
- Illustration or photo for "No workouts yet" states
- Motivational imagery for milestone achievements

**Achievement Badges**: Icon-based graphics for goals hit

## Animations

**Minimal, Purposeful**:
- Progress ring/bar fill animations on data load
- Smooth accordion expansion for training plans
- Subtle hover lift on cards (translate-y-1)
- No distracting background animations

## Data Visualization Principles

**Charts**: Use clean line graphs for pace trends, bar charts for weekly mileage
**Color Coding**: Different workout types get distinct visual treatments (easy runs, tempo, intervals, long runs)
**Hierarchy**: Large bold numbers for key metrics, supporting context smaller/muted

## Accessibility

- All interactive elements 44px minimum touch target
- Form inputs with visible labels and validation
- Progress indicators with text alternatives
- Calendar keyboard navigation support

## Responsive Strategy

**Mobile-First**: Stack cards vertically, full-width data displays
**Tablet**: 2-column layouts where appropriate
**Desktop**: Multi-column dashboards, sidebar navigation, expanded calendar views

## Key Design Principles

1. **Data First**: Metrics and progress always prominent, decorative elements minimal
2. **Motivational Clarity**: Clear goal visualization drives user engagement
3. **Scanability**: Athletes need quick glances - hierarchy is critical
4. **Consistency**: Repeating patterns for workout types, metrics build familiarity
5. **Performance Feel**: Clean, fast-loading interface matches athletic mindset
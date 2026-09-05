import { SECTION_PRESETS, buildSectionPreset } from "../registry/sectionPresets";
import { resolveIcon } from "../utils/resolveIcon";
import { useStudioStore } from "../store/StudioStoreContext";
import { addSectionAtRoot } from "../registry/insertionHelpers";

export function SectionsPanel() {
  const { state, dispatch } = useStudioStore();

  return (
    <div className="p-3 space-y-2">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground px-1 mb-1">Blocos prontos</p>
      {SECTION_PRESETS.map((preset) => {
        const Icon = resolveIcon(preset.icon);
        return (
          <button
            key={preset.key}
            onClick={() => addSectionAtRoot(dispatch, state, buildSectionPreset(preset.key))}
            className="w-full flex items-center gap-3 rounded-lg border border-border bg-background hover:border-primary/50 hover:bg-primary/5 transition-colors p-3 text-left"
          >
            <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">{preset.label}</p>
              <p className="text-[11px] text-muted-foreground truncate">{preset.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

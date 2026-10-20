import { Check, ChevronDown, Search } from "lucide-react";
import {
    Children,
    isValidElement,
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    useState,
    type KeyboardEvent,
    type ReactNode,
    type SelectHTMLAttributes,
} from "react";

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "multiple" | "size" | "value" | "defaultValue"> & {
    value?: string | number;
    defaultValue?: string | number;
};

function optionText(children: ReactNode): string {
    return Children.toArray(children).map((child) => {
        if (typeof child === "string" || typeof child === "number") return String(child);
        return isValidElement<{ children?: ReactNode }>(child) ? optionText(child.props.children) : "";
    }).join("");
}

export function Select({ children, id, value, defaultValue, disabled, required, className = "", ...props }: SelectProps) {
    const generatedId = useId();
    const controlId = id || generatedId;
    const listId = `${controlId}-options`;
    const root = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const native = useRef<HTMLSelectElement>(null);
    const menu = useRef<HTMLDivElement>(null);
    const typeahead = useRef({ text: "", at: 0 });
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const [uncontrolledValue, setUncontrolledValue] = useState(String(defaultValue ?? ""));
    const supportsPopover = typeof HTMLElement !== "undefined" && "showPopover" in HTMLElement.prototype;
    const options = Children.toArray(children).filter(isValidElement).map((element) => {
        const option = element.props as { value?: string | number; children?: ReactNode; disabled?: boolean };
        const label = optionText(option.children).trim();
        return { value: String(option.value ?? label), label, disabled: !!option.disabled };
    });
    const selectedValue = String(value ?? uncontrolledValue);
    const selected = options.find((option) => option.value === selectedValue) ?? options[0];
    const available = options.filter((option) => !(required && option.value === ""));
    const searchable = available.length > 8;
    const filtered = available.filter((option) => option.label.toLocaleLowerCase("id-ID").includes(query.trim().toLocaleLowerCase("id-ID")));
    const activeOption = filtered[activeIndex];
    const accessibleLabel = props["aria-label"] || trigger.current?.labels?.[0]?.textContent || "pilihan";

    function close(restoreFocus = false) {
        setOpen(false);
        if (restoreFocus) trigger.current?.focus({ preventScroll: true });
    }

    function show(last = false) {
        if (disabled) return;
        setQuery("");
        let selectedIndex = available.findIndex((option) => option.value === selectedValue && !option.disabled);
        if (last) available.forEach((option, index) => { if (!option.disabled) selectedIndex = index; });
        setActiveIndex(Math.max(0, selectedIndex >= 0 ? selectedIndex : available.findIndex((option) => !option.disabled)));
        setOpen(true);
    }

    function choose(index: number) {
        const option = filtered[index];
        if (!option || option.disabled || !native.current) return;
        setUncontrolledValue(option.value);
        native.current.value = option.value;
        native.current.dispatchEvent(new Event("change", { bubbles: true }));
        close(true);
    }

    function keyDown(event: KeyboardEvent<HTMLElement>) {
        if (event.key === "Escape" && open) {
            event.preventDefault();
            event.stopPropagation();
            close(true);
            return;
        }
        const searching = event.target instanceof HTMLInputElement;
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) && !(searching && ["Home", "End"].includes(event.key))) {
            event.preventDefault();
            if (!open) {
                show(event.key === "ArrowUp" || event.key === "End");
                return;
            }
            const direction = event.key === "ArrowUp" || event.key === "End" ? -1 : 1;
            let next = event.key === "Home" ? 0 : event.key === "End" ? filtered.length - 1 : activeIndex + direction;
            while (next >= 0 && next < filtered.length && filtered[next].disabled) next += direction;
            if (next >= 0 && next < filtered.length) setActiveIndex(next);
        } else if (event.key === "Enter" || (event.key === " " && !searching)) {
            event.preventDefault();
            if (open) choose(activeIndex);
            else show();
        } else if (!searching && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            event.preventDefault();
            const now = performance.now();
            typeahead.current = { text: (now - typeahead.current.at < 700 ? typeahead.current.text : "") + event.key.toLocaleLowerCase("id-ID"), at: now };
            if (!open) show();
            const next = (open ? filtered : available).findIndex((option) => !option.disabled && option.label.toLocaleLowerCase("id-ID").startsWith(typeahead.current.text));
            if (next >= 0) setActiveIndex(next);
        }
    }

    useLayoutEffect(() => {
        const panel = menu.current;
        if (!panel || !supportsPopover) return;
        if (!open || disabled) {
            if (panel.matches(":popover-open")) panel.hidePopover();
            return;
        }
        panel.showPopover();
        function position() {
            if (!panel || !trigger.current) return;
            const rect = trigger.current.getBoundingClientRect();
            const viewport = window.visualViewport;
            const top = viewport?.offsetTop ?? 0;
            const left = viewport?.offsetLeft ?? 0;
            const width = viewport?.width ?? innerWidth;
            const height = viewport?.height ?? innerHeight;
            const below = top + height - rect.bottom - 12;
            const above = rect.top - top - 12;
            const side = below >= Math.min(300, above) ? "bottom" : "top";
            panel.dataset.side = side;
            panel.style.width = `${Math.min(Math.max(rect.width, 220), width - 24)}px`;
            panel.style.maxHeight = `${Math.max(80, Math.min(360, side === "bottom" ? below : above))}px`;
            panel.style.left = `${Math.max(left + 12, Math.min(rect.left, left + width - panel.offsetWidth - 12))}px`;
            panel.style.top = `${side === "bottom" ? rect.bottom + 8 : Math.max(top + 8, rect.top - panel.offsetHeight - 8)}px`;
        }
        position();
        const observer = new ResizeObserver(position);
        observer.observe(panel);
        window.addEventListener("resize", position);
        window.addEventListener("scroll", position, true);
        window.visualViewport?.addEventListener("resize", position);
        window.visualViewport?.addEventListener("scroll", position);
        return () => {
            observer.disconnect();
            window.removeEventListener("resize", position);
            window.removeEventListener("scroll", position, true);
            window.visualViewport?.removeEventListener("resize", position);
            window.visualViewport?.removeEventListener("scroll", position);
            if (panel.matches(":popover-open")) panel.hidePopover();
        };
    }, [open, disabled, supportsPopover]);

    useEffect(() => {
        if (open) document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
    }, [open, activeIndex, query, listId]);

    if (!supportsPopover) {
        return <select {...props} id={id} value={value} defaultValue={defaultValue} disabled={disabled} required={required} className={className}>{children}</select>;
    }

    return (
        <div ref={root} className={`select-root ${className}`} onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) close();
        }}>
            <select
                {...props}
                ref={native}
                id={`${controlId}-native`}
                value={value ?? uncontrolledValue}
                required={required}
                disabled={disabled}
                className="select-native"
                aria-hidden="true"
                aria-label={undefined}
                tabIndex={-1}
                onInvalid={(event) => {
                    event.preventDefault();
                    const firstInvalid = event.currentTarget.form?.querySelector("input:invalid, select:invalid, textarea:invalid");
                    if (firstInvalid && firstInvalid !== event.currentTarget) return;
                    trigger.current?.focus();
                    show();
                }}
            >{children}</select>
            <button
                ref={trigger}
                id={controlId}
                type="button"
                role="combobox"
                className="select-trigger"
                disabled={disabled}
                aria-label={props["aria-label"]}
                aria-labelledby={props["aria-labelledby"]}
                aria-describedby={props["aria-describedby"]}
                aria-invalid={props["aria-invalid"]}
                aria-required={required || undefined}
                aria-haspopup="listbox"
                aria-expanded={open && !disabled}
                aria-controls={listId}
                popoverTarget={`${controlId}-menu`}
                aria-activedescendant={open && activeOption ? `${listId}-${activeIndex}` : undefined}
                data-placeholder={selectedValue === "" && required ? "true" : undefined}
                onClick={(event) => {
                    event.preventDefault();
                    if (open) close();
                    else show();
                }}
                onKeyDown={keyDown}
            >
                <span>{selected?.label || "Pilih opsi"}</span>
                <ChevronDown size={17} aria-hidden="true" />
            </button>
            <div
                ref={menu}
                id={`${controlId}-menu`}
                popover="auto"
                className="select-menu"
                onToggle={(event) => {
                    setOpen(event.currentTarget.matches(":popover-open"));
                }}
                onKeyDown={keyDown}
            >
                {searchable && (
                    <div className="select-search">
                        <Search size={16} aria-hidden="true" />
                        <input
                            type="search"
                            aria-label={`Cari ${accessibleLabel}`}
                            aria-controls={listId}
                            aria-activedescendant={activeOption ? `${listId}-${activeIndex}` : undefined}
                            autoComplete="off"
                            placeholder="Cari pilihan…"
                            value={query}
                            onChange={(event) => {
                                setQuery(event.target.value);
                                setActiveIndex(0);
                            }}
                        />
                    </div>
                )}
                <div id={listId} role="listbox" aria-label={String(accessibleLabel)} className="select-options" tabIndex={-1}>
                    {filtered.map((option, index) => (
                        <div
                            key={option.value}
                            id={`${listId}-${index}`}
                            role="option"
                            aria-selected={option.value === selectedValue}
                            aria-disabled={option.disabled || undefined}
                            data-highlighted={index === activeIndex || undefined}
                            className="select-option"
                            onPointerMove={() => { if (!option.disabled) setActiveIndex(index); }}
                            onPointerDown={(event) => event.preventDefault()}
                            onClick={() => choose(index)}
                        >
                            <span>{option.label}</span>
                            {option.value === selectedValue && <Check size={17} aria-hidden="true" />}
                        </div>
                    ))}
                    {!filtered.length && <p className="select-empty" role="status">Tidak ada pilihan yang cocok.</p>}
                </div>
                {searchable && <div className="select-footnote">{filtered.length} pilihan tersedia</div>}
            </div>
        </div>
    );
}

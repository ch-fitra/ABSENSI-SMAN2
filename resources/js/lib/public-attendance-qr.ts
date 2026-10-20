export async function downloadPublicQr(
    element: SVGSVGElement,
    formId: number,
    format: "png" | "svg",
): Promise<void> {
    const svg = element.cloneNode(true) as SVGSVGElement;
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("width", "1440");
    svg.setAttribute("height", "2000");
    const sourceUrl = URL.createObjectURL(new Blob(
        [new XMLSerializer().serializeToString(svg)],
        { type: "image/svg+xml;charset=utf-8" },
    ));
    let downloadUrl = sourceUrl;
    try {
        if (format === "png") {
            const image = new Image();
            image.src = sourceUrl;
            await image.decode();
            const canvas = document.createElement("canvas");
            canvas.width = 1440;
            canvas.height = 2000;
            const context = canvas.getContext("2d");
            if (!context) throw new Error("Canvas unavailable");
            context.fillStyle = "#ffffff";
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob((result) => result ? resolve(result) : reject(new Error("PNG unavailable")), "image/png");
            });
            downloadUrl = URL.createObjectURL(blob);
        }
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `qr-absensi-${formId}.${format}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
    } finally {
        window.setTimeout(() => {
            URL.revokeObjectURL(sourceUrl);
            if (downloadUrl !== sourceUrl) URL.revokeObjectURL(downloadUrl);
        }, 1000);
    }
}

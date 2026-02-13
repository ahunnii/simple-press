/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle,
  Download,
  FileText,
  Loader2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "~/trpc/react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { Progress } from "~/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";

type ImportStep = "upload" | "review" | "options" | "importing" | "complete";

type ProductImportWizardProps = {
  business: {
    id: string;
    name: string;
  };
};

export function ProductImportWizard({ business }: ProductImportWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [importId, setImportId] = useState<string | null>(null);
  const [importData, setImportData] = useState<any>(null);

  // Import options
  const [onDuplicateSku, setOnDuplicateSku] = useState<
    "skip" | "update" | "create_new"
  >("skip");
  const [importImages, setImportImages] = useState(true);
  const [createCollections, setCreateCollections] = useState(true);

  const parseCSV = api.import.parseCSV.useMutation({
    onSuccess: (data) => {
      setImportId(data.importId);
      setImportData(data);
      setStep("review");
      toast.success("CSV parsed successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to parse CSV");
    },
  });

  const executeImport = api.import.executeImport.useMutation({
    onSuccess: (data) => {
      setStep("complete");
      toast.success(`Imported ${data.imported} products successfully`);
    },
    onError: (error) => {
      toast.error(error.message || "Import failed");
      setStep("review");
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    const content = await file.text();
    parseCSV.mutate({
      businessId: business.id,
      csvContent: content,
      filename: file.name,
    });
  };

  const handleContinueToOptions = () => {
    setStep("options");
  };

  const handleStartImport = () => {
    if (!importId) return;

    setStep("importing");
    executeImport.mutate({
      importId,
      options: {
        onDuplicateSku,
        importImages,
        createCollectionsFromCategories: createCollections,
      },
    });
  };

  const handleDone = () => {
    router.push("/admin/products");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Import Products</h1>
          <p className="mt-2 text-gray-600">
            Import your products from WooCommerce
          </p>
        </div>

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <Step
              number={1}
              label="Upload"
              active={step === "upload"}
              completed={[
                "review",
                "options",
                "importing",
                "complete",
              ].includes(step)}
            />
            <Step
              number={2}
              label="Review"
              active={step === "review"}
              completed={["options", "importing", "complete"].includes(step)}
            />
            <Step
              number={3}
              label="Options"
              active={step === "options"}
              completed={["importing", "complete"].includes(step)}
            />
            <Step
              number={4}
              label="Import"
              active={["importing", "complete"].includes(step)}
              completed={step === "complete"}
            />
          </div>
        </div>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <Card>
            <CardHeader>
              <CardTitle>Upload WooCommerce CSV</CardTitle>
              <CardDescription>
                Export your products from WooCommerce and upload the CSV file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  <strong>How to export from WooCommerce:</strong>
                  <ol className="mt-2 list-inside list-decimal space-y-1 text-sm">
                    <li>Go to WooCommerce → Products</li>
                    <li>Click &quot;Export&quot; at the top</li>
                    <li>Select &quot;All products&quot; or filter as needed</li>
                    <li>Click &quot;Generate CSV&quot;</li>
                    <li>Download and upload the file below</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="rounded-lg border-2 border-dashed border-gray-300 p-8">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="csv-upload">
                      <span className="cursor-pointer text-blue-600 hover:text-blue-500">
                        Choose a file
                      </span>
                      <input
                        id="csv-upload"
                        type="file"
                        accept=".csv"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                    <p className="mt-1 text-sm text-gray-500">
                      or drag and drop
                    </p>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">CSV up to 10MB</p>
                </div>
              </div>

              {file && (
                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <Button onClick={handleUpload} disabled={parseCSV.isPending}>
                    {parseCSV.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Parsing...
                      </>
                    ) : (
                      "Parse CSV"
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Review */}
        {step === "review" && importData && (
          <Card>
            <CardHeader>
              <CardTitle>Review Import</CardTitle>
              <CardDescription>
                Review the products that will be imported
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">Total Products</p>
                  <p className="text-2xl font-bold">
                    {
                      (importData as { summary: { total: number } }).summary
                        .total
                    }
                  </p>
                </div>
                <div className="rounded-lg bg-green-50 p-4">
                  <p className="text-sm text-green-600">Valid</p>
                  <p className="text-2xl font-bold text-green-600">
                    {
                      (importData as { summary: { valid: number } }).summary
                        .valid
                    }
                  </p>
                </div>
                <div className="rounded-lg bg-red-50 p-4">
                  <p className="text-sm text-red-600">Invalid</p>
                  <p className="text-2xl font-bold text-red-600">
                    {importData.summary.invalid}
                  </p>
                </div>
                <div className="rounded-lg bg-blue-50 p-4">
                  <p className="text-sm text-blue-600">Images</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {importData.summary.totalImages}
                  </p>
                </div>
              </div>

              {/* Product Types */}
              <div>
                <h3 className="mb-3 font-medium">Product Types</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Simple Products</span>
                    <Badge variant="outline">
                      {importData.summary.simpleProducts}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Variable Products</span>
                    <Badge variant="outline">
                      {importData.summary.variableProducts}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Variations</span>
                    <Badge variant="outline">
                      {importData.summary.variations}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Invalid Products */}
              {importData.invalid.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>
                      {importData.invalid.length} products have errors
                    </strong>
                    <div className="mt-2 max-h-40 overflow-y-auto">
                      {importData.invalid
                        .slice(0, 5)
                        .map((product: any, index: number) => (
                          <div key={index} className="mt-1 text-sm">
                            • {product.name}: {product.errors.join(", ")}
                          </div>
                        ))}
                      {importData.invalid.length > 5 && (
                        <p className="mt-2 text-sm">
                          ...and {importData.invalid.length - 5} more
                        </p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setStep("upload")}>
                  Cancel
                </Button>
                <Button
                  onClick={handleContinueToOptions}
                  disabled={importData.summary.valid === 0}
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Options */}
        {step === "options" && (
          <Card>
            <CardHeader>
              <CardTitle>Import Options</CardTitle>
              <CardDescription>
                Configure how products should be imported
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Duplicate SKU handling */}
              <div>
                <Label className="text-base font-medium">
                  If SKU already exists:
                </Label>
                <RadioGroup
                  value={onDuplicateSku}
                  onValueChange={(value: any) => setOnDuplicateSku(value)}
                  className="mt-3 space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="skip" id="skip" />
                    <Label
                      htmlFor="skip"
                      className="cursor-pointer font-normal"
                    >
                      Skip (don&apos;t import duplicates)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="update" id="update" />
                    <Label
                      htmlFor="update"
                      className="cursor-pointer font-normal"
                    >
                      Update (overwrite existing products)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="create_new" id="create_new" />
                    <Label
                      htmlFor="create_new"
                      className="cursor-pointer font-normal"
                    >
                      Create New (import anyway with different SKU)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Additional options */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="import-images"
                    checked={importImages}
                    onCheckedChange={(checked) => setImportImages(!!checked)}
                  />
                  <Label
                    htmlFor="import-images"
                    className="cursor-pointer font-normal"
                  >
                    Import product images
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="create-collections"
                    checked={createCollections}
                    onCheckedChange={(checked) =>
                      setCreateCollections(!!checked)
                    }
                  />
                  <Label
                    htmlFor="create-collections"
                    className="cursor-pointer font-normal"
                  >
                    Create collections from categories
                  </Label>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setStep("review")}>
                  Back
                </Button>
                <Button onClick={handleStartImport}>Start Import</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Importing */}
        {step === "importing" && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-blue-600" />
                <h3 className="text-lg font-medium">Importing Products...</h3>
                <p className="mt-2 text-gray-600">
                  This may take a few minutes depending on the number of
                  products.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Complete */}
        {step === "complete" && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-600" />
                <h3 className="text-lg font-medium">Import Complete!</h3>
                <p className="mt-2 text-gray-600">
                  Your products have been imported successfully.
                </p>

                <div className="mt-8">
                  <Button onClick={handleDone}>Go to Products</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Helper component
function Step({
  number,
  label,
  active,
  completed,
}: {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${completed ? "bg-green-600 text-white" : active ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"} `}
      >
        {completed ? <CheckCircle className="h-5 w-5" /> : number}
      </div>
      <span className={`text-sm ${active ? "font-medium" : "text-gray-600"}`}>
        {label}
      </span>
    </div>
  );
}

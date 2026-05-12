import { useEffect, useRef, useState } from "react";
import Input from "../../../components/UI/Input";
import Button from "../../../components/UI/Button";
import Select from "../../../components/UI/Select"; // Added Select import
import { submitBorrowerProfile } from "../../../api/borrower/post";
import { jwtDecode } from "jwt-decode";
import { borrowerProfileSchema } from "../../../validations/borrower.validation";

interface BorrowerPayload {
  FirstName: string;
  LastName: string;
  DateOfBirth: string;
  SSN: string;
  Address: string;
  City: string;
  State: string;
  ZipCode: string;
  Email: string;
  profileCompleted: boolean;
  UserId: string;
  Unit: string;
  PhoneNumber: string; // Added PhoneNumber to interface
  HighestDegree: string; // Added HighestDegree to interface
  [key: string]: any;
}

export default function PersonalInfoStep({
  defaultValues,
  onSuccess,
  allowNextWithoutValidation = false,
}: any) {
  const [data, setData] = useState(defaultValues || {});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  console.log("data:", data, "defaultValues:", defaultValues);
  const isProfileCompleted = !!defaultValues?.Id;
  const isDateOfBirthAvailable = !!defaultValues.DateOfBirth;
  const isSSNAvailable = !!defaultValues.SSN;
  localStorage.setItem("borrowerId", jwtDecode<{ guid: string }>(localStorage.getItem("borrower_token") || "").guid);


  // ... inside the component
  const isInitialMount = useRef(true);

  useEffect(() => {
    const fetchZipData = async () => {
      if (!isInitialMount.current && data.ZipCode?.length === 5) {
        try {
          setLoading(true); // Show loading while validating zip
          const response = await fetch(`https://api.zippopotam.us/us/${data.ZipCode}`);
          const result = await response.json();

          // Check if the response is empty (invalid Zip)
          if (!result.places || result.places.length === 0) {
            setApiError("Invalid Zip Code. Please enter a valid US Zip Code.");
            setData((prev: any) => ({ ...prev, City: "", State: "" }));
          } else {
            // Valid Zip found
            const place = result.places[0];
            setApiError(null); // Clear any previous zip error
            setData((prev: any) => ({
              ...prev,
              City: place["place name"],
              State: place["state"]
            }));
          }
        } catch (error) {
          console.error("Zip lookup failed", error);
        } finally {
          setLoading(false);
        }
      } else {
        isInitialMount.current = false;
      }
    };

    fetchZipData();
  }, [data.ZipCode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Clear zip error when user modifies the zip code
    if (name === "ZipCode") {
      setApiError(null);
    }

    if (["SSN", "ZipCode", "Unit", "PhoneNumber"].includes(name)) {
      const onlyNums = value.replace(/[^0-9]/g, "");
      let max = 99;
      if (name === "SSN") max = 9;
      if (name === "ZipCode") max = 5;
      if (name === "Unit") max = 4;
      if (name === "PhoneNumber") max = 10;

      if (onlyNums.length <= max) {
        setData({ ...data, [name]: onlyNums });
      }
      return;
    }
    setData({ ...data, [name]: value });
  };

  const validate = (payload: any) => {
    if (allowNextWithoutValidation) return { error: null };
    const { error } = borrowerProfileSchema.validate(payload, { abortEarly: true });
    return { error };
  };

  const handleNext = async () => {
    setApiError(null);

    const payload: BorrowerPayload = {
      FirstName: data.FirstName,
      LastName: data.LastName,
      DateOfBirth: data.DateOfBirth,
      SSN: data.SSN,
      Address: data.Address,
      City: data.City,
      State: data.State,
      ZipCode: data.ZipCode,
      Email: data.Email || jwtDecode<{ email: string }>(localStorage.getItem("borrower_token") || "").email,
      profileCompleted: true,
      Unit: data.Unit,
      HighestDegree: data.HighestDegree, // Added HighestDegree to payload
      PhoneNumber: data.PhoneNumber,
      UserId: jwtDecode<{ guid: string }>(localStorage.getItem("borrower_token") || "").guid,
    };

    const { error } = validate(payload);

    if (error) {
      setApiError(error.details[0].message);
      return;
    }

    const hasChanges = (Object.keys(payload) as Array<keyof BorrowerPayload>).some(key => {
      if (key === 'UserId' || key === 'profileCompleted') return false;

      const currentVal = payload[key];
      const originalVal = defaultValues[key];

      if (key === 'DateOfBirth' && originalVal && currentVal) {
        return originalVal.split('T')[0] !== currentVal.split('T')[0];
      }

      return currentVal !== originalVal;
    });

    console.log("isProfileCompleted:", isProfileCompleted, "hasChanges:", hasChanges);
    if (isProfileCompleted && !hasChanges) {
      localStorage.setItem("profileId", defaultValues.Id);
      onSuccess(data);
      return;
    }

    setLoading(true);

    const result = await submitBorrowerProfile(payload);

    if (!result.success) {
      setApiError(result.message || "Profile submission failed");
      setLoading(false);
      return;
    }

    console.log("Profile submission successful with response:", result.response);

    // FIX: Check if successRecords exists, otherwise use the direct ID from the response
    const profileId = result.response.successRecords?.[0]?.id || result.response.id;

    if (!profileId) {
      console.error("No ID found in response", result.response);
      setApiError("Server returned a success but no record ID was found.");
      setLoading(false);
      return;
    }

    localStorage.setItem("profileId", profileId);

    const userId = jwtDecode<{ guid: string }>(localStorage.getItem("borrower_token") || "").guid;

    const updatedData = {
      ...data,
      profileCompleted: true,
      borrowerProfileId: profileId,
    };

    localStorage.setItem("borrowerId", userId);
    setLoading(false);
    onSuccess(updatedData);
  };

  return (
    <>
      <h2 className="text-xl font-semibold mb-4">Borrower Information</h2>

      {apiError && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded">
          {apiError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="First Name*" name="FirstName" value={data.FirstName || ""} onChange={handleChange} />
        <Input label="Last Name*" name="LastName" value={data.LastName || ""} onChange={handleChange} />

        {/* Added Highest Degree Select Box */}
        <Select
          label="Highest Degree*"
          name="HighestDegree"
          options={["Undergraduate", "Masters", "PHD", "Others"]}
          value={data.HighestDegree || ""}
          onChange={handleChange}
        />

        <Input type="date" label="Date of Birth*" name="DateOfBirth" value={data.DateOfBirth ? data.DateOfBirth.split('T')[0] : ""} disabled={isDateOfBirthAvailable} onChange={handleChange} />
        <Input label="SSN*" name="SSN" type="number" maxLength={9} value={data.SSN || ""} disabled={isSSNAvailable} onChange={handleChange} />
        <Input label="Address*" name="Address" value={data.Address || ""} onChange={handleChange} className="md:col-span-2" />
        <Input label="City*" name="City" value={data.City || ""} onChange={handleChange} />
        <Input label="State*" name="State" value={data.State || ""} onChange={handleChange} />
        <Input label="Zip*" name="ZipCode" type="tel" value={data.ZipCode || ""} onChange={handleChange} />
        <Input label="Apt/Unit Number*" name="Unit" value={data.Unit || ""} onChange={handleChange} />
        <Input label="Phone Number*" name="PhoneNumber" type="tel" value={data.PhoneNumber || ""} onChange={handleChange} />
        <Input label="Email*" name="Email" type="email" disabled value={jwtDecode<{ email: string }>(localStorage.getItem("borrower_token") || "").email} onChange={handleChange} />
      </div>

      <div className="flex justify-end mt-6">
        <Button onClick={handleNext} loading={loading}>
          Next
        </Button>
      </div>
    </>
  );
}
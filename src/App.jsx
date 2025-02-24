import { useState } from "react";
import pdfToText from "react-pdftotext";
import { Button } from "./components/ui/button";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { Progress } from "./components/ui/progress";
import { Card } from "./components/ui/card";
import MatchGauge from "./components/ui/MatchGauge";
import { Dialog } from "./components/ui/dialog";
import { Tooltip } from "react-tooltip";
import {
  UploadCloud,
  Building2,
  MapPin,
  Star,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const skills = {
  Python: { synonyms: ["python"], weight: 5 },
  SQL: { synonyms: ["sql", "structured query language"], weight: 4 },
  "Machine Learning": { synonyms: ["machine learning", "ml"], weight: 5 },
  "Deep Learning": { synonyms: ["deep learning", "dl"], weight: 4 },
  "Data Analysis": { synonyms: ["data analysis", "data analytics"], weight: 3 },
  "Power BI": { synonyms: ["power bi"], weight: 3 },
  R: { synonyms: ["r language", "r programming"], weight: 4 },
  Tableau: { synonyms: ["tableau"], weight: 3 },
  "Big Data": { synonyms: ["big data"], weight: 4 },
  "Apache Spark": { synonyms: ["spark", "apache spark"], weight: 4 },
  AWS: { synonyms: ["aws", "amazon web services"], weight: 4 },
  Azure: { synonyms: ["azure", "microsoft azure"], weight: 3 },
  TensorFlow: { synonyms: ["tensorflow"], weight: 4 },
  Keras: { synonyms: ["keras"], weight: 4 },
  "Natural Language Processing": {
    synonyms: ["nlp", "natural language processing"],
    weight: 4,
  },
  Git: { synonyms: ["git"], weight: 3 },
  NoSQL: { synonyms: ["nosql", "non-relational databases"], weight: 3 },
  Java: { synonyms: ["java"], weight: 3 },
  "C++": { synonyms: ["c++", "cpp"], weight: 3 },
  Docker: { synonyms: ["docker"], weight: 4 },
  Hadoop: { synonyms: ["hadoop"], weight: 4 },
  Kafka: { synonyms: ["kafka", "apache kafka"], weight: 4 },
  Scala: { synonyms: ["scala"], weight: 3 },
  Pandas: { synonyms: ["pandas"], weight: 3 },
  NumPy: { synonyms: ["numpy"], weight: 3 },
  "Scikit-learn": { synonyms: ["scikit-learn", "sklearn"], weight: 3 },
  Matplotlib: { synonyms: ["matplotlib"], weight: 2 },
  Seaborn: { synonyms: ["seaborn"], weight: 2 },
  "Cloud Computing": { synonyms: ["cloud computing"], weight: 4 },
  ETL: { synonyms: ["etl", "extract transform load"], weight: 3 },
  "Google Cloud": { synonyms: ["google cloud", "gcp"], weight: 4 },
  Snowflake: { synonyms: ["snowflake"], weight: 3 },
  MongoDB: { synonyms: ["mongodb"], weight: 3 },
  PostgreSQL: { synonyms: ["postgresql", "postgres"], weight: 3 },
  MySQL: { synonyms: ["mysql"], weight: 3 },
  Linux: { synonyms: ["linux"], weight: 3 },
  Agile: { synonyms: ["agile", "scrum methodology"], weight: 2 },
  Scrum: { synonyms: ["scrum"], weight: 2 },
  Jira: { synonyms: ["jira"], weight: 2 },
  DevOps: { synonyms: ["devops"], weight: 4 },
  Kubernetes: { synonyms: ["kubernetes", "k8s"], weight: 4 },
  "CI/CD": {
    synonyms: ["ci/cd", "continuous integration", "continuous deployment"],
    weight: 4,
  },
};

export default function CVUpload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 6;

  const handleFileChange = (event) => {
    const uploadedFile = event.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
    }
  };

  const searchSkills = (text) => {
    const foundSkills = {};
    const normalizedText = text.toLowerCase();

    // Helper function to escape special regex characters
    const escapeRegExp = (string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    };

    // Helper function to create word boundary patterns that work with special characters
    const createWordPattern = (word) => {
      const escaped = escapeRegExp(word);
      return new RegExp(`(?:^|\\s)${escaped}(?:$|\\s|[.,;!?)])`, "gi");
    };

    // Create a single pass through the text for better performance
    for (const [skill, data] of Object.entries(skills)) {
      // Check the main skill name first
      let pattern = createWordPattern(skill);
      const mainMatches = (normalizedText.match(pattern) || []).length;

      if (mainMatches > 0) {
        foundSkills[skill] = mainMatches * data.weight;
      }

      // Check synonyms
      if (data.synonyms?.length) {
        for (const synonym of data.synonyms) {
          pattern = createWordPattern(synonym);
          const synonymMatches = (normalizedText.match(pattern) || []).length;

          if (synonymMatches > 0) {
            foundSkills[skill] =
              (foundSkills[skill] || 0) + synonymMatches * data.weight;
          }
        }
      }
    }

    return foundSkills;
  };

  const calculateMatchPercentage = (jobSkills, cvSkills) => {
    // Calculate the sum of weights for the CV skills
    const cvTotalWeight = Object.values(cvSkills).reduce(
      (acc, weight) => acc + weight,
      0
    );

    // Calculate the sum of weighted skills for the job
    const jobTotalWeight = jobSkills.reduce((acc, skillObj) => {
      const skillName = skillObj.skill;
      const skillWeight = cvSkills[skillName] || 0; // Get the weight from the CV skills
      return acc + skillWeight * skillObj.occurrences;
    }, 0);

    // Calculate the match percentage
    const matchPercentage = (jobTotalWeight / cvTotalWeight) * 100;

    // Cap the match percentage at 100%
    return Math.min(Math.round(matchPercentage), 100);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    try {
      // Extract text from the PDF
      const text = await pdfToText(file);
      const skillsFound = searchSkills(text);
      console.log("Extracted skills:", skillsFound);

      // Get the list of skills from the CV
      const cvSkills = Object.keys(skillsFound);

      console.log("Skills from CV:", cvSkills);

      // Query Firestore for jobs
      const jobsRef = collection(db, "glassdoor_jobs");
      const querySnapshot = await getDocs(jobsRef);

      const jobsFromFirestore = [];
      querySnapshot.forEach((doc) => {
        const jobData = doc.data();
        const jobSkills = jobData.skills; // Define jobSkills here

        // Check if the job has at least one skill matching the CV skills
        const hasMatchingSkill = jobSkills.some((skillObj) =>
          cvSkills.includes(skillObj.skill)
        );

        if (hasMatchingSkill) {
          // Calculate the match percentage
          const matchPercentage = calculateMatchPercentage(
            jobSkills,
            skillsFound
          ); // Pass jobSkills here
          jobsFromFirestore.push({ id: doc.id, ...jobData, matchPercentage }); // Include matchPercentage in the job object
        }
      });

      // Sort jobs by matchPercentage in descending order
      jobsFromFirestore.sort((a, b) => b.matchPercentage - a.matchPercentage);

      console.log(
        "Filtered and sorted jobs from Firestore:",
        jobsFromFirestore
      );

      // Set the jobs state with the filtered and sorted data
      setJobs(jobsFromFirestore);
    } catch (error) {
      console.error(
        "Error extracting text from PDF or querying Firestore:",
        error
      );
    } finally {
      setUploading(false);
    }
  };

  const Pagination = ({ currentPage, totalPages, paginate }) => {
    const maxVisibleButtons = 5; // Number of visible pagination buttons
    const halfVisibleButtons = Math.floor(maxVisibleButtons / 2);

    let startPage = Math.max(1, currentPage - halfVisibleButtons);
    let endPage = Math.min(totalPages, currentPage + halfVisibleButtons);

    // Adjust startPage and endPage if we're near the edges
    if (currentPage <= halfVisibleButtons) {
      endPage = Math.min(maxVisibleButtons, totalPages);
    } else if (currentPage >= totalPages - halfVisibleButtons) {
      startPage = Math.max(totalPages - maxVisibleButtons + 1, 1);
    }

    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex justify-center items-center space-x-2 mt-6">
        <Button
          onClick={() => paginate(currentPage - 1)}
          disabled={currentPage === 1}
          variant="outline"
          size="sm"
        >
          <ChevronLeft size={16} />
        </Button>

        {/* Show first page and ellipsis if needed */}
        {startPage > 1 && (
          <>
            <Button
              onClick={() => paginate(1)}
              variant={currentPage === 1 ? "default" : "outline"}
              size="sm"
            >
              1
            </Button>
            {startPage > 2 && <span className="text-gray-500">...</span>}
          </>
        )}

        {/* Visible page buttons */}
        {pages.map((page) => (
          <Button
            key={page}
            onClick={() => paginate(page)}
            variant={currentPage === page ? "default" : "outline"}
            size="sm"
          >
            {page}
          </Button>
        ))}

        {/* Show last page and ellipsis if needed */}
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && (
              <span className="text-gray-500">...</span>
            )}
            <Button
              onClick={() => paginate(totalPages)}
              variant={currentPage === totalPages ? "default" : "outline"}
              size="sm"
            >
              {totalPages}
            </Button>
          </>
        )}

        <Button
          onClick={() => paginate(currentPage + 1)}
          disabled={currentPage === totalPages}
          variant="outline"
          size="sm"
        >
          <ChevronRight size={16} />
        </Button>
      </div>
    );
  };

  // Pagination logic
  const indexOfLastJob = currentPage * jobsPerPage;
  const indexOfFirstJob = indexOfLastJob - jobsPerPage;
  const currentJobs = jobs.slice(indexOfFirstJob, indexOfLastJob);
  const totalPages = Math.ceil(jobs.length / jobsPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
      <div className="w-full max-w-6xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">
            Find Your Perfect Job Match
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            Upload your CV and let us find the best opportunities for you
          </p>
        </div>

        <div className="border-dashed border-2 border-gray-300 rounded-xl p-12 bg-white shadow-sm hover:border-blue-400 transition-colors">
          {!file ? (
            <label className="cursor-pointer flex flex-col items-center space-y-6">
              <div className="p-6 bg-blue-50 rounded-full">
                <UploadCloud size={64} className="text-blue-500" />
              </div>
              <div className="text-center">
                <p className="text-2xl font-medium text-gray-700">
                  Drop your CV here
                </p>
                <p className="text-lg text-gray-500">or click to browse</p>
              </div>
              <input
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx"
              />
            </label>
          ) : (
            <div className="flex flex-col items-center space-y-6">
              <div className="flex items-center space-x-4">
                <p className="text-xl font-medium text-gray-700">{file.name}</p>
                <button
                  onClick={() => setFile(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
              <Button onClick={handleUpload} className="w-48 text-lg">
                {uploading ? "Uploading..." : "Analyze CV"}
              </Button>
            </div>
          )}
        </div>

        {uploading && (
          <div className="space-y-4">
            <Progress value={50} className="h-3" />
            <p className="text-center text-lg text-gray-600">
              Analyzing your CV and finding matches...
            </p>
          </div>
        )}

        {jobs.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              Recommended Jobs
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {currentJobs.map((job, index) => (
                <Card
                  key={index}
                  onClick={() => setSelectedJob(job)}
                  className="cursor-pointer hover:border-blue-200 transition-all duration-200 p-6"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <h3
                        className="font-semibold text-xl text-gray-900 truncate max-w-[70%]"
                        data-tooltip-id={`title-tooltip-${index}`}
                        data-tooltip-content={job.title}
                      >
                        {job.title}
                      </h3>
                      <Tooltip
                        id={`title-tooltip-${index}`}
                        className="z-50"
                        place="top"
                        effect="solid"
                        delayShow={300}
                      />

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <Star
                          size={20}
                          className="text-yellow-400 fill-current"
                        />
                        <span className="text-lg text-gray-600">
                          {job.rating}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Building2 size={20} className="flex-shrink-0" />
                        <span
                          className="text-lg truncate min-w-[50px] max-w-[120px]"
                          data-tooltip-id={`company-tooltip-${index}`}
                          data-tooltip-content={job.companyName}
                        >
                          {job.companyName}
                        </span>
                        <Tooltip
                          id={`company-tooltip-${index}`}
                          className="z-50"
                          place="top"
                          effect="solid"
                          delayShow={300}
                        />
                      </div>

                      <div className="flex items-center space-x-1 flex-shrink-0">
                        <MatchGauge
                          percentage={job.matchPercentage}
                          size="medium"
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 text-gray-600">
                      <MapPin size={20} className="flex-shrink-0" />
                      <span
                        className="text-lg truncate max-w-[120px]"
                        data-tooltip-id={`location-tooltip-${index}`}
                        data-tooltip-content={job.location}
                      >
                        {job.location}
                      </span>
                      <Tooltip
                        id={`location-tooltip-${index}`}
                        className="z-50"
                        place="top"
                        effect="solid"
                        delayShow={300}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {job.skills.map((skillObj, i) => (
                        <span
                          key={i}
                          className="px-3 py-1.5 bg-blue-50 text-blue-600 text-sm rounded-full"
                        >
                          {skillObj.skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                paginate={paginate}
              />
            )}
          </div>
        )}

        {selectedJob && (
          <Dialog
            open={!!selectedJob}
            onClose={() => setSelectedJob(null)}
            title={
              <div className="flex justify-between items-center w-full">
                <h2 className="text-xl font-semibold truncate max-w-[70%]">
                  {selectedJob?.title}
                </h2>
                <div className="flex items-center gap-4">
                  <MatchGauge percentage={selectedJob.matchPercentage} />
                  <button
                    onClick={() => setSelectedJob(null)}
                    className="p-1 hover:bg-gray-100 rounded-full flex-shrink-0"
                  >
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>
              </div>
            }
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 max-w-[70%]">
                  <Building2
                    className="text-gray-500 flex-shrink-0"
                    size={20}
                  />
                  <span className="font-medium truncate">
                    {selectedJob?.companyName}
                  </span>
                </div>
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <Star size={16} className="text-yellow-400 fill-current" />
                  <span>{selectedJob?.rating}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <MapPin className="text-gray-500 flex-shrink-0" size={20} />
                <span className="truncate">{selectedJob?.location}</span>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-2">Description</h3>
                <p className="text-gray-600 whitespace-pre-wrap break-words">
                  {selectedJob?.description}
                </p>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-2">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedJob?.skills.map((skillObj, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm"
                    >
                      {skillObj.skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => {
                    if (selectedJob?.link) {
                      window.open(selectedJob.link, "_blank"); // Open the link in a new tab
                    } else {
                      console.error("No link found for this job.");
                    }
                  }}
                >
                  Apply Now
                </Button>
              </div>
            </div>
          </Dialog>
        )}
      </div>
    </div>
  );
}

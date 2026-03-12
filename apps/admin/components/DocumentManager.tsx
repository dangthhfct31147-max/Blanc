import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Edit2,
  Trash2,
  BookOpen,
  Star,
  MoreHorizontal,
  Sparkles,
  Eye,
  FileText,
  Link as LinkIcon,
  Download,
  Globe,
  Lock,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Phone,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Clock,
  Calendar,
  CheckCircle,
  ListOrdered,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from 'lucide-react';
import { Course, Document, CourseSection } from '../types';
import { generateCourseSyllabus } from '../services/geminiService';
import { documentService, validateAndSanitizeUrl } from '../services/documentService';
import { courseService } from '../services/courseService';
import { Dropdown } from './ui/Dropdown';
import { ConfirmActionModal } from './ui/UserModals';
import { useAuth } from '../contexts/AuthContext';
import { convertGoogleDriveImageUrl } from '../utils/googleDrive';

type TabType = 'courses' | 'documents';
type ModalType = 'course' | 'document' | 'view-course' | 'view-document' | null;

// Toast notification component for feedback
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-amber-500';

  return (
    <div className={`fixed right-4 bottom-4 ${bgColor} animate-fade-in-up z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-white shadow-lg`}>
      {type === 'success' && (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      )}
      {type === 'error' && <AlertTriangle size={20} />}
      {type === 'warning' && <AlertTriangle size={20} />}
      <span>{message}</span>
      <button onClick={onClose} title="Close notification" className="ml-2 hover:opacity-80">
        ✕
      </button>
    </div>
  );
};

// Collapsible Section Component
interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, icon, children, defaultOpen = true, badge }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between bg-gray-50 px-4 py-3 transition-colors hover:bg-gray-100"
      >
        <div className="flex items-center gap-2 font-medium text-gray-700">
          {icon}
          <span>{title}</span>
          {badge && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">{badge}</span>}
        </div>
        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {isOpen && <div className="space-y-4 p-4">{children}</div>}
    </div>
  );
};

// Pagination component with Google-like style
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  // Google-style pagination logic: show max 10 page numbers
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 10;

    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate start and end of visible range
      let start = Math.max(2, currentPage - 3);
      let end = Math.min(totalPages - 1, currentPage + 3);

      // Adjust if at the beginning
      if (currentPage <= 4) {
        end = Math.min(8, totalPages - 1);
      }

      // Adjust if at the end
      if (currentPage >= totalPages - 3) {
        start = Math.max(2, totalPages - 7);
      }

      // Add ellipsis after first page if needed
      if (start > 2) {
        pages.push('ellipsis');
      }

      // Add middle pages
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Add ellipsis before last page if needed
      if (end < totalPages - 1) {
        pages.push('ellipsis');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="mt-6 flex items-center justify-center gap-1 py-4">
      {/* Previous button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
          currentPage === 1 ? 'cursor-not-allowed text-gray-300' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        <ChevronLeft size={18} />
        <span className="hidden sm:inline">Previous</span>
      </button>

      {/* Page numbers */}
      <div className="flex items-center gap-1">
        {pageNumbers.map((page, index) =>
          page === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="px-2 py-2 text-gray-400">
              •••
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`h-10 min-w-10 rounded-lg text-sm font-medium transition-all duration-200 ${
                currentPage === page ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {page}
            </button>
          )
        )}
      </div>

      {/* Next button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
          currentPage === totalPages ? 'cursor-not-allowed text-gray-300' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight size={18} />
      </button>
    </div>
  );
};

// Items per page constant
const ITEMS_PER_PAGE = 6;

const DocumentManager: React.FC = () => {
  const { user } = useAuth();
  const canManageDocuments = user?.role === 'admin' || user?.role === 'super_admin';
  const [activeTab, setActiveTab] = useState<TabType>('courses');
  const [courses, setCourses] = useState<Course[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Pagination states
  const [coursePage, setCoursePage] = useState(1);
  const [documentPage, setDocumentPage] = useState(1);

  // Search state for documents
  const [documentSearchQuery, setDocumentSearchQuery] = useState('');

  // Loading states
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isBulkDeletingDocuments, setIsBulkDeletingDocuments] = useState(false);
  const [isBulkDeletingCourses, setIsBulkDeletingCourses] = useState(false);

  // View Details state
  const [viewingCourse, setViewingCourse] = useState<Course | null>(null);
  const [isLoadingCourseDetails, setIsLoadingCourseDetails] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
  const [isLoadingDocumentDetails, setIsLoadingDocumentDetails] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const [pendingConfirm, setPendingConfirm] = useState<null | {
    title: string;
    message: string;
    confirmLabel: string;
    variant?: 'danger' | 'warning' | 'success' | 'info';
    onConfirm: () => Promise<void>;
  }>(null);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  // Abort controller for cancelling requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Pagination calculations
  const courseTotalPages = useMemo(() => Math.ceil(courses.length / ITEMS_PER_PAGE), [courses.length]);

  // Filter documents by search query
  const filteredDocuments = useMemo(() => {
    if (!documentSearchQuery.trim()) return documents;
    const query = documentSearchQuery.toLowerCase().trim();
    return documents.filter(
      (doc) =>
        doc.title.toLowerCase().includes(query) ||
        doc.author.toLowerCase().includes(query) ||
        doc.category.toLowerCase().includes(query) ||
        doc.description?.toLowerCase().includes(query)
    );
  }, [documents, documentSearchQuery]);

  const documentTotalPages = useMemo(() => Math.ceil(filteredDocuments.length / ITEMS_PER_PAGE), [filteredDocuments.length]);

  // Get paginated items
  const paginatedCourses = useMemo(() => {
    const startIndex = (coursePage - 1) * ITEMS_PER_PAGE;
    return courses.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [courses, coursePage]);

  const paginatedDocuments = useMemo(() => {
    const startIndex = (documentPage - 1) * ITEMS_PER_PAGE;
    return filteredDocuments.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredDocuments, documentPage]);

  // Reset to page 1 when data changes
  useEffect(() => {
    if (coursePage > courseTotalPages && courseTotalPages > 0) {
      setCoursePage(1);
    }
  }, [courseTotalPages, coursePage]);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setDocumentPage(1);
  }, [documentSearchQuery]);

  // Course Form State
  const [newTitle, setNewTitle] = useState('');
  const [newInstructor, setNewInstructor] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newContactType, setNewContactType] = useState<'phone' | 'link'>('phone');
  const [newPrice, setNewPrice] = useState<number>(0);
  const [newLevel, setNewLevel] = useState<Course['level']>('Beginner');
  const [generatedSyllabus, setGeneratedSyllabus] = useState('');
  // New course schedule fields
  const [newDuration, setNewDuration] = useState('');
  const [newHoursPerWeek, setNewHoursPerWeek] = useState<number>(0);
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newImage, setNewImage] = useState('');
  // New: Benefits and Sections
  const [benefits, setBenefits] = useState<string[]>([]);
  const [sections, setSections] = useState<CourseSection[]>([]);

  // Document Form State
  const [docTitle, setDocTitle] = useState('');
  const [docAuthor, setDocAuthor] = useState('');
  const [docCategory, setDocCategory] = useState<Document['category']>('Tutorial');
  const [docLink, setDocLink] = useState('');
  const [docDescription, setDocDescription] = useState('');
  const [docIsPublic, setDocIsPublic] = useState(true);
  const [docThumbnail, setDocThumbnail] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);

  // Show toast notification
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ message, type });
  }, []);

  // Fetch courses from API
  const fetchCourses = useCallback(async () => {
    try {
      setIsLoadingCourses(true);
      const response = await courseService.getAll({ limit: 100 });
      setCourses(response.items);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      setCourses([]);
      showToast('Failed to load courses. Please try again.', 'error');
    } finally {
      setIsLoadingCourses(false);
    }
  }, [showToast]);

  // Fetch documents from API
  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoadingDocuments(true);
      const response = await documentService.getAll({ limit: 100 });
      setDocuments(response.items);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      setDocuments([]);
      showToast('Failed to load documents', 'error');
    } finally {
      setIsLoadingDocuments(false);
    }
  }, [showToast]);

  const handleDeleteAll = useCallback(() => {
    if (!canManageDocuments) {
      showToast('Admin access required', 'error');
      return;
    }

    const targetLabel = activeTab === 'courses' ? 'courses' : 'documents';
    const title = activeTab === 'courses' ? 'Delete all courses' : 'Delete all documents';
    const successMessage = activeTab === 'courses' ? 'Deleted all courses' : 'Deleted all documents';
    const failureMessage = activeTab === 'courses' ? 'Failed to delete all courses. Please try again.' : 'Failed to delete all documents. Please try again.';

    setPendingConfirm({
      title,
      message: `Are you sure you want to delete ALL ${targetLabel}? This action cannot be undone.`,
      confirmLabel: 'Delete all',
      variant: 'danger',
      onConfirm: async () => {
        try {
          if (activeTab === 'courses') {
            setIsBulkDeletingCourses(true);
            await courseService.deleteAll();
            setCoursePage(1);
            await fetchCourses();
          } else {
            setIsBulkDeletingDocuments(true);
            await documentService.deleteAll();
            setDocumentSearchQuery('');
            setDocumentPage(1);
            await fetchDocuments();
          }
          showToast(successMessage, 'success');
        } catch (error) {
          console.error(`Failed to delete all ${targetLabel}:`, error);
          showToast(error instanceof Error ? error.message : failureMessage, 'error');
        } finally {
          setIsBulkDeletingDocuments(false);
          setIsBulkDeletingCourses(false);
        }
      },
    });
  }, [activeTab, canManageDocuments, fetchCourses, fetchDocuments, showToast]);

  // Initial data fetch - use Promise.all for parallel loading
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchCourses(), fetchDocuments()]);
    };
    loadData();

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchCourses, fetchDocuments]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('.action-dropdown')) return;
      setOpenActionId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleGenerateAI = async () => {
    if (!newTitle) return;
    setIsGenerating(true);
    const syllabus = await generateCourseSyllabus(newTitle, newLevel);
    setGeneratedSyllabus(syllabus);
    setIsGenerating(false);
  };

  const getLevelColor = (level: Course['level']) => {
    switch (level) {
      case 'Beginner':
        return 'bg-green-100 text-green-800';
      case 'Intermediate':
        return 'bg-blue-100 text-blue-800';
      case 'Advanced':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: Document['category']) => {
    switch (category) {
      case 'Tutorial':
        return 'bg-blue-100 text-blue-800';
      case 'Reference':
        return 'bg-purple-100 text-purple-800';
      case 'Guide':
        return 'bg-green-100 text-green-800';
      case 'Research':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const resetCourseForm = useCallback(() => {
    setNewTitle('');
    setNewInstructor('');
    setNewContact('');
    setNewContactType('phone');
    setNewPrice(0);
    setNewLevel('Beginner');
    setGeneratedSyllabus('');
    setNewDuration('');
    setNewHoursPerWeek(0);
    setNewStartDate('');
    setNewEndDate('');
    setNewImage('');
    setBenefits([]);
    setSections([]);
    setEditingId(null);
  }, []);

  const resetDocumentForm = useCallback(() => {
    setDocTitle('');
    setDocAuthor('');
    setDocCategory('Tutorial');
    setDocLink('');
    setDocDescription('');
    setDocIsPublic(true);
    setDocThumbnail('');
    setLinkError(null);
    setEditingId(null);
  }, []);

  const openCourseModal = (course?: Course) => {
    resetDocumentForm();
    if (course) {
      setEditingId(course.id);
      setNewTitle(course.title);
      setNewInstructor(course.instructor);
      setNewContact(course.contactInfo || course.contact || '');
      setNewContactType(course.contactType || 'phone');
      setNewPrice(course.price);
      setNewLevel(course.level);
      setGeneratedSyllabus(course.description || '');
      // New fields
      setNewDuration(course.duration || '');
      setNewHoursPerWeek(course.hoursPerWeek || 0);
      setNewStartDate(course.startDate?.split('T')[0] || '');
      setNewEndDate(course.endDate?.split('T')[0] || '');
      setNewImage(course.image || '');
      setBenefits(course.benefits || []);
      setSections(course.sections || []);
    } else {
      resetCourseForm();
    }
    setModalType('course');
    setIsModalOpen(true);
  };

  const openDocumentModal = (document?: Document) => {
    resetCourseForm();
    if (document) {
      setEditingId(document.id);
      setDocTitle(document.title);
      setDocAuthor(document.author);
      setDocCategory(document.category);
      setDocLink(document.link);
      setDocDescription(document.description || '');
      setDocIsPublic(document.isPublic);
      setDocThumbnail(document.thumbnail || '');
    } else {
      resetDocumentForm();
    }
    setModalType('document');
    setIsModalOpen(true);
  };

  // Benefits handlers
  const addBenefit = () => {
    setBenefits([...benefits, '']);
  };

  const updateBenefit = (index: number, value: string) => {
    const updated = [...benefits];
    updated[index] = value;
    setBenefits(updated);
  };

  const removeBenefit = (index: number) => {
    setBenefits(benefits.filter((_, i) => i !== index));
  };

  // Sections handlers
  const addSection = () => {
    setSections([...sections, { title: '', lessons: 0, duration: '', description: '' }]);
  };

  const updateSection = (index: number, field: keyof CourseSection, value: string | number) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], [field]: value };
    setSections(updated);
  };

  const removeSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index));
  };

  // Handle course save (create/update) with API
  const handleAddCourse = async () => {
    if (isSaving) return;

    try {
      setIsSaving(true);

      // Filter out empty benefits
      const validBenefits = benefits.filter((b) => b.trim());
      // Filter out empty sections
      const validSections = sections.filter((s) => s.title.trim());
      const rawCourseImage = newImage.trim();
      const normalizedCourseImage = rawCourseImage ? convertGoogleDriveImageUrl(rawCourseImage) : '';

      // Build course data with all fields
      const courseData = {
        title: newTitle.trim(),
        instructor: newInstructor.trim(),
        contactInfo: newContact.trim() || undefined,
        contactType: newContactType,
        price: newPrice,
        level: newLevel,
        description: generatedSyllabus,
        duration: newDuration.trim() || undefined,
        hoursPerWeek: newHoursPerWeek || undefined,
        startDate: newStartDate || undefined,
        endDate: newEndDate || undefined,
        image: normalizedCourseImage || rawCourseImage || `https://picsum.photos/seed/${newTitle.replace(/\s/g, '')}/400/300`,
        benefits: validBenefits.length > 0 ? validBenefits : undefined,
        sections: validSections.length > 0 ? validSections : undefined,
      };

      if (editingId) {
        // Update existing course via API
        await courseService.update(editingId, courseData);
        showToast('Course updated successfully', 'success');
      } else {
        // Create new course via API
        await courseService.create(courseData);
        showToast('Course created successfully', 'success');
      }

      // Refresh courses from API
      await fetchCourses();
      setIsModalOpen(false);
      resetCourseForm();
    } catch (error) {
      console.error('Failed to save course:', error);
      showToast('Failed to save course', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Validate link on change with debounce effect
  const handleLinkChange = (value: string) => {
    setDocLink(value);
    if (value.trim()) {
      const validation = validateAndSanitizeUrl(value);
      if (!validation.isValid) {
        setLinkError(validation.error || 'Invalid URL');
      } else {
        setLinkError(null);
      }
    } else {
      setLinkError(null);
    }
  };

  // Handle document save (create/update) with API
  const handleAddDocument = async () => {
    if (isSaving) return;

    // Final validation before submit
    const validation = validateAndSanitizeUrl(docLink);
    if (!validation.isValid) {
      setLinkError(validation.error || 'Invalid URL');
      return;
    }

    try {
      setIsSaving(true);
      const rawThumbnail = docThumbnail.trim();
      const normalizedThumbnail = rawThumbnail ? convertGoogleDriveImageUrl(rawThumbnail) : '';

      const documentData = {
        title: docTitle.trim(),
        author: docAuthor.trim(),
        category: docCategory,
        link: validation.sanitizedUrl,
        description: docDescription.trim(),
        isPublic: docIsPublic,
        thumbnail: normalizedThumbnail || rawThumbnail || undefined,
      };

      if (editingId) {
        // Update existing document via API
        await documentService.update(editingId, documentData);
        showToast('Document updated successfully', 'success');
      } else {
        // Create new document via API
        await documentService.create(documentData);
        showToast('Document created successfully', 'success');
      }

      // Refresh documents from API
      await fetchDocuments();
      setIsModalOpen(false);
      resetDocumentForm();
    } catch (error) {
      console.error('Failed to save document:', error);
      showToast(error instanceof Error ? error.message : 'Failed to save document', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle course actions with API
  const handleCourseAction = async (action: string, course: Course) => {
    if (action === 'view') {
      // Open view details modal with existing data first
      setViewingCourse(course);
      setModalType('view-course');
      setIsModalOpen(true);

      // Only fetch fresh data if missing detailed fields (sections, benefits)
      const needsFreshData = !course.sections || !course.benefits || !course.description;
      if (needsFreshData) {
        try {
          setIsLoadingCourseDetails(true);
          const freshCourse = await courseService.getById(course.id);
          setViewingCourse(freshCourse);
        } catch (error) {
          console.error('Failed to fetch course details:', error);
          // Keep the existing course data if fetch fails
        } finally {
          setIsLoadingCourseDetails(false);
        }
      }
    } else if (action === 'edit') {
      openCourseModal(course);
    } else if (action === 'delete') {
      setOpenActionId(null);
      setPendingConfirm({
        title: 'Delete course',
        message: `Are you sure you want to delete "${course.title}"?`,
        confirmLabel: 'Delete',
        variant: 'danger',
        onConfirm: async () => {
          try {
            setIsDeleting(course.id);
            await courseService.delete(course.id);
            setCourses((prev) => prev.filter((c) => c.id !== course.id));
            showToast('Course deleted successfully', 'success');
          } catch (error) {
            console.error('Failed to delete course:', error);
            showToast('Failed to delete course. Please try again.', 'error');
          } finally {
            setIsDeleting(null);
          }
        },
      });
      return;
    } else if (action === 'toggle-visibility') {
      try {
        const newVisibility = !(course.isPublic ?? true);
        await courseService.toggleVisibility(course.id, newVisibility);
        // Update state locally instead of fetching all courses again
        setCourses((prev) => prev.map((c) => (c.id === course.id ? { ...c, isPublic: newVisibility } : c)));
        showToast(`Course is now ${newVisibility ? 'public' : 'private'}`, 'success');
      } catch (error) {
        console.error('Failed to toggle visibility:', error);
        showToast('Failed to update visibility. Please try again.', 'error');
      }
    } else if (action === 'open-link') {
      // Get the contact link from course
      const contactLink = course.contactInfo || course.contact;
      if (contactLink && contactLink.startsWith('http')) {
        // Safely open link in new tab with security measures
        const validation = validateAndSanitizeUrl(contactLink);
        if (validation.isValid) {
          window.open(validation.sanitizedUrl, '_blank', 'noopener,noreferrer');
        } else {
          showToast('Invalid or unsafe URL', 'error');
        }
      } else {
        showToast('No link available for this course', 'warning');
      }
    } else {
      console.log(`${action} course: ${course.title}`);
    }
    setOpenActionId(null);
  };

  // Handle document actions with API
  const handleDocumentAction = async (action: string, document: Document) => {
    if (action === 'view') {
      // Open view details modal with existing data first
      setViewingDocument(document);
      setModalType('view-document');
      setIsModalOpen(true);

      // Fetch fresh data to get latest comments, ratings, etc.
      try {
        setIsLoadingDocumentDetails(true);
        const freshDocument = await documentService.getById(document.id);
        setViewingDocument(freshDocument);
      } catch (error) {
        console.error('Failed to fetch document details:', error);
        // Keep the existing document data if fetch fails
      } finally {
        setIsLoadingDocumentDetails(false);
      }
    } else if (action === 'edit') {
      openDocumentModal(document);
    } else if (action === 'delete') {
      setOpenActionId(null);
      setPendingConfirm({
        title: 'Delete document',
        message: `Are you sure you want to delete "${document.title}"?`,
        confirmLabel: 'Delete',
        variant: 'danger',
        onConfirm: async () => {
          try {
            setIsDeleting(document.id);
            await documentService.delete(document.id);
            setDocuments((prev) => prev.filter((d) => d.id !== document.id));
            showToast('Document deleted successfully', 'success');
          } catch (error) {
            console.error('Failed to delete document:', error);
            showToast('Failed to delete document. Please try again.', 'error');
          } finally {
            setIsDeleting(null);
          }
        },
      });
      return;
    } else if (action === 'toggle-visibility') {
      try {
        const newVisibility = !document.isPublic;
        await documentService.toggleVisibility(document.id, newVisibility);
        // Update state locally instead of fetching all documents again
        setDocuments((prev) => prev.map((d) => (d.id === document.id ? { ...d, isPublic: newVisibility } : d)));
        showToast(`Document is now ${newVisibility ? 'public' : 'private'}`, 'success');
      } catch (error) {
        console.error('Failed to toggle visibility:', error);
        showToast('Failed to update visibility. Please try again.', 'error');
      }
    } else if (action === 'open-link') {
      // Safely open link in new tab with security measures
      const validation = validateAndSanitizeUrl(document.link);
      if (validation.isValid) {
        window.open(validation.sanitizedUrl, '_blank', 'noopener,noreferrer');
      }
    } else {
      console.log(`${action} document: ${document.title}`);
    }
    setOpenActionId(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalType(null);
    resetCourseForm();
    resetDocumentForm();
    setViewingCourse(null);
    setViewingDocument(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <ConfirmActionModal
        isOpen={Boolean(pendingConfirm)}
        onClose={() => {
          if (!isConfirmLoading) setPendingConfirm(null);
        }}
        title={pendingConfirm?.title || ''}
        message={pendingConfirm?.message || ''}
        confirmLabel={pendingConfirm?.confirmLabel || 'Confirm'}
        variant={pendingConfirm?.variant || 'danger'}
        onConfirm={() => {
          if (!pendingConfirm) return;
          setIsConfirmLoading(true);
          pendingConfirm.onConfirm().finally(() => {
            setIsConfirmLoading(false);
            setPendingConfirm(null);
          });
        }}
        isLoading={isConfirmLoading}
      />
      {/* Toast Notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Documents & Courses</h2>
          <p className="mt-1 text-gray-500">Manage learning materials, documents and instructors</p>
        </div>
        <div className="flex gap-2">
          {/* Refresh button */}
          <button
            type="button"
            onClick={() => (activeTab === 'courses' ? fetchCourses() : fetchDocuments())}
            disabled={isLoadingCourses || isLoadingDocuments}
            title="Refresh data"
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-50"
          >
            <RefreshCw size={18} className={isLoadingCourses || isLoadingDocuments ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={handleDeleteAll}
            disabled={
              !canManageDocuments ||
              (activeTab === 'courses' ? isLoadingCourses : isLoadingDocuments) ||
              (activeTab === 'courses' ? isBulkDeletingCourses : isBulkDeletingDocuments)
            }
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white shadow-sm transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            title={activeTab === 'courses' ? 'Delete all courses' : 'Delete all documents'}
          >
            <Trash2 size={18} />
            {(activeTab === 'courses' ? isBulkDeletingCourses : isBulkDeletingDocuments) ? 'Deleting...' : 'Delete All'}
          </button>
          <button
            type="button"
            onClick={() => openDocumentModal()}
            className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-white shadow-sm transition-all hover:bg-amber-600"
          >
            <Plus size={18} />
            Add Document
          </button>
          <button
            type="button"
            onClick={() => openCourseModal()}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-white shadow-sm transition-all hover:bg-emerald-700"
          >
            <Plus size={18} />
            Add Course
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('courses')}
          className={`border-b-2 px-6 py-3 text-sm font-medium transition-all ${
            activeTab === 'courses' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <BookOpen size={18} />
            Courses ({courses.length}){isLoadingCourses && <Loader2 size={14} className="animate-spin" />}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`border-b-2 px-6 py-3 text-sm font-medium transition-all ${
            activeTab === 'documents' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText size={18} />
            Documents ({documents.length}){isLoadingDocuments && <Loader2 size={14} className="animate-spin" />}
          </div>
        </button>
      </div>

      {/* Courses Table */}
      {activeTab === 'courses' && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          {isLoadingCourses ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-emerald-500" />
              <span className="ml-2 text-gray-500">Loading courses...</span>
            </div>
          ) : courses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <BookOpen size={48} className="mb-4 text-gray-300" />
              <p className="text-gray-500">No courses found</p>
              <button onClick={() => openCourseModal()} className="mt-4 font-medium text-emerald-600 hover:text-emerald-700">
                Add your first course
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-900 uppercase">
                  <tr>
                    <th className="px-6 py-4">Course</th>
                    <th className="px-6 py-4">Instructor</th>
                    <th className="px-6 py-4">Contact</th>
                    <th className="px-6 py-4">Level</th>
                    <th className="px-6 py-4">Rating</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedCourses.map((course, index) => (
                    <tr key={course.id} className={`transition-colors hover:bg-gray-50 ${isDeleting === course.id ? 'opacity-50' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <img src={course.image} alt="" className="h-10 w-16 rounded-md object-cover" />
                          <div>
                            <p className="font-semibold text-gray-900">{course.title}</p>
                            <div className="mt-1 flex gap-2">
                              {course.sections && course.sections.length > 0 && (
                                <span className="text-xs text-gray-400">{course.sections.length} sections</span>
                              )}
                              {course.benefits && course.benefits.length > 0 && (
                                <span className="text-xs text-emerald-500">{course.benefits.length} benefits</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900">{course.instructor}</span>
                      </td>
                      <td className="px-6 py-4">
                        {course.contactInfo || course.contact ? (
                          (course.contactInfo || course.contact || '').startsWith('http') ? (
                            <a
                              href={course.contactInfo || course.contact}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-sm font-medium text-blue-600 transition-colors hover:text-blue-800"
                              title={course.contactInfo || course.contact}
                            >
                              <LinkIcon size={14} />
                              <span className="max-w-[100px] truncate">{(course.contactInfo || course.contact || '').replace(/^https?:\/\//, '')}</span>
                              <ExternalLink size={12} />
                            </a>
                          ) : (
                            <a
                              href={`tel:${course.contactInfo || course.contact}`}
                              className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 transition-colors hover:text-emerald-800"
                            >
                              <Phone size={14} />
                              <span>{course.contactInfo || course.contact}</span>
                            </a>
                          )
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getLevelColor(course.level)}`}>
                          {course.level}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <Star size={14} className="fill-yellow-400 text-yellow-400" />
                          <span className="font-medium text-gray-900">{course.rating}</span>
                          <span className="text-xs text-gray-400">({course.reviewsCount})</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">{course.price === 0 ? 'Free' : `₫${course.price.toLocaleString()}`}</td>
                      <td className="px-6 py-4 text-right">
                        {isDeleting === course.id ? (
                          <Loader2 size={18} className="inline animate-spin text-gray-400" />
                        ) : (
                          <div className="action-dropdown relative inline-block text-left">
                            <button
                              title="Course actions"
                              onClick={() => setOpenActionId(openActionId === course.id ? null : course.id)}
                              className={`rounded-lg border p-2 transition-all duration-200 ${
                                openActionId === course.id
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-600 shadow-sm'
                                  : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <MoreHorizontal size={18} />
                            </button>

                            {openActionId === course.id && (
                              <div
                                className={`animate-fade-in-up absolute right-0 z-[100] w-52 rounded-xl border border-gray-200 bg-white shadow-2xl ${index < 2 ? 'top-full mt-2 origin-top-right' : 'bottom-full mb-2 origin-bottom-right'}`}
                              >
                                <div className="py-1">
                                  <button
                                    onClick={() => handleCourseAction('view', course)}
                                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                                  >
                                    <Eye size={16} className="text-gray-400" />
                                    <span>View Details</span>
                                  </button>
                                  <button
                                    onClick={() => handleCourseAction('edit', course)}
                                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                                  >
                                    <Edit2 size={16} className="text-gray-400" />
                                    <span>Edit Course</span>
                                  </button>
                                  <button
                                    onClick={() => handleCourseAction('toggle-visibility', course)}
                                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                                  >
                                    {(course.isPublic ?? true) ? <Lock size={16} className="text-gray-400" /> : <Globe size={16} className="text-gray-400" />}
                                    <span>{(course.isPublic ?? true) ? 'Make Private' : 'Make Public'}</span>
                                  </button>
                                  {(course.contactInfo || course.contact) && (course.contactInfo || course.contact || '').startsWith('http') && (
                                    <button
                                      onClick={() => handleCourseAction('open-link', course)}
                                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                                    >
                                      <ExternalLink size={16} className="text-gray-400" />
                                      <span>Open Link</span>
                                    </button>
                                  )}
                                  <div className="my-1 border-t border-gray-50"></div>
                                  <button
                                    onClick={() => handleCourseAction('delete', course)}
                                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
                                  >
                                    <Trash2 size={16} />
                                    <span>Delete Course</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Courses Pagination */}
          {!isLoadingCourses && courses.length > 0 && <Pagination currentPage={coursePage} totalPages={courseTotalPages} onPageChange={setCoursePage} />}
        </div>
      )}

      {/* Documents Table */}
      {activeTab === 'documents' &&
        (isLoadingDocuments ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-12 shadow-sm">
            <Loader2 size={40} className="mb-4 animate-spin text-amber-500" />
            <p className="text-gray-500">Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-12 shadow-sm">
            <FileText size={48} className="mb-4 text-gray-300" />
            <p className="mb-4 text-gray-500">No documents found</p>
            <button
              onClick={() => openDocumentModal()}
              className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-white transition-colors hover:bg-amber-600"
            >
              <Plus size={18} />
              Add Document
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Search size={20} className="text-gray-400" />
              </div>
              <input
                type="text"
                value={documentSearchQuery}
                onChange={(e) => setDocumentSearchQuery(e.target.value)}
                placeholder="Search documents by title, author, category..."
                className="w-full rounded-xl border border-gray-300 bg-white py-3 pr-10 pl-12 text-gray-900 placeholder-gray-400 shadow-sm transition-all focus:border-transparent focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              {documentSearchQuery && (
                <button
                  onClick={() => setDocumentSearchQuery('')}
                  title="Clear search"
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 transition-colors hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Search Results Info */}
            {documentSearchQuery && (
              <div className="flex items-center justify-between px-1">
                <p className="text-sm text-gray-500">
                  Found <span className="font-semibold text-amber-600">{filteredDocuments.length}</span> document{filteredDocuments.length !== 1 ? 's' : ''}{' '}
                  matching "<span className="font-medium">{documentSearchQuery}</span>"
                </p>
                {filteredDocuments.length > 0 && (
                  <button onClick={() => setDocumentSearchQuery('')} className="text-sm font-medium text-amber-600 hover:text-amber-700">
                    Clear search
                  </button>
                )}
              </div>
            )}

            {/* No Search Results */}
            {filteredDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-12 shadow-sm">
                <Search size={48} className="mb-4 text-gray-300" />
                <p className="mb-2 text-gray-500">No documents match your search</p>
                <button onClick={() => setDocumentSearchQuery('')} className="font-medium text-amber-600 hover:text-amber-700">
                  Clear search
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-900 uppercase">
                      <tr>
                        <th className="px-6 py-4">Document</th>
                        <th className="px-6 py-4">Author</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Rating</th>
                        <th className="px-6 py-4">Downloads</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginatedDocuments.map((document, index) => (
                        <tr key={document.id} className={`transition-colors hover:bg-gray-50 ${isDeleting === document.id ? 'opacity-50' : ''}`}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {document.thumbnail ? (
                                <img src={document.thumbnail} alt="" className="h-10 w-10 rounded-lg object-cover" />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                                  {isDeleting === document.id ? (
                                    <Loader2 size={20} className="animate-spin text-amber-600" />
                                  ) : (
                                    <FileText size={20} className="text-amber-600" />
                                  )}
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-gray-900">{document.title}</p>
                                <p className="text-xs text-gray-400">Updated: {formatDate(document.updatedAt)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-medium text-gray-900">{document.author}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getCategoryColor(document.category)}`}>
                              {document.category}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1">
                              <Star size={14} className="fill-yellow-400 text-yellow-400" />
                              <span className="font-medium text-gray-900">{document.rating ?? 0}</span>
                              <span className="text-xs text-gray-400">({document.reviewsCount ?? 0})</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1">
                              <Download size={14} className="text-gray-400" />
                              <span className="font-medium text-gray-900">{document.downloads.toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                document.isPublic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {document.isPublic ? <Globe size={12} /> : <Lock size={12} />}
                              {document.isPublic ? 'Public' : 'Private'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="action-dropdown relative inline-block text-left">
                              <button
                                title="Document actions"
                                onClick={() => setOpenActionId(openActionId === document.id ? null : document.id)}
                                disabled={isDeleting === document.id}
                                className={`rounded-lg border p-2 transition-all duration-200 ${
                                  openActionId === document.id
                                    ? 'border-amber-500 bg-amber-50 text-amber-600 shadow-sm'
                                    : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                                } ${isDeleting === document.id ? 'cursor-not-allowed opacity-50' : ''}`}
                              >
                                <MoreHorizontal size={18} />
                              </button>

                              {openActionId === document.id && (
                                <div
                                  className={`animate-fade-in-up absolute right-0 z-[100] w-52 rounded-xl border border-gray-200 bg-white shadow-2xl ${index < 2 ? 'top-full mt-2 origin-top-right' : 'bottom-full mb-2 origin-bottom-right'}`}
                                >
                                  <div className="py-1">
                                    <button
                                      onClick={() => handleDocumentAction('view', document)}
                                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                                    >
                                      <Eye size={16} className="text-gray-400" />
                                      <span>View Details</span>
                                    </button>
                                    <button
                                      onClick={() => handleDocumentAction('open-link', document)}
                                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                                    >
                                      <ExternalLink size={16} className="text-gray-400" />
                                      <span>Open Link</span>
                                    </button>
                                    <button
                                      onClick={() => handleDocumentAction('edit', document)}
                                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                                    >
                                      <Edit2 size={16} className="text-gray-400" />
                                      <span>Edit Document</span>
                                    </button>
                                    <button
                                      onClick={() => handleDocumentAction('toggle-visibility', document)}
                                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                                    >
                                      {document.isPublic ? <Lock size={16} className="text-gray-400" /> : <Globe size={16} className="text-gray-400" />}
                                      <span>{document.isPublic ? 'Make Private' : 'Make Public'}</span>
                                    </button>
                                    <div className="my-1 border-t border-gray-50"></div>
                                    <button
                                      onClick={() => handleDocumentAction('delete', document)}
                                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
                                    >
                                      <Trash2 size={16} />
                                      <span>Delete Document</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Documents Pagination */}
                <Pagination currentPage={documentPage} totalPages={documentTotalPages} onPageChange={setDocumentPage} />
              </div>
            )}
          </div>
        ))}

      {/* Course Modal */}
      {isModalOpen &&
        modalType === 'course' &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
            <div className="animate-fade-in-up relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                <h3 className="text-lg font-semibold text-gray-900">{editingId ? 'Edit Course' : 'New Course'}</h3>
                <button onClick={closeModal} title="Close modal" className="p-1 text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-6">
                {/* Basic Info */}
                <CollapsibleSection title="Basic Information" icon={<BookOpen size={18} />} defaultOpen={true}>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="mb-1 block text-sm font-medium text-gray-700">Course Title *</label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 transition-all outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                        placeholder="e.g., Advanced React Patterns"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Instructor *</label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 transition-all outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                        placeholder="e.g., Dr. Smith"
                        value={newInstructor}
                        onChange={(e) => setNewInstructor(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Price (VND)</label>
                      <input
                        type="number"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 transition-all outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                        placeholder="0"
                        value={newPrice}
                        onChange={(e) => setNewPrice(Number(e.target.value))}
                      />
                    </div>

                    <div>
                      <Dropdown
                        label="Difficulty Level"
                        options={[
                          { value: 'Beginner', label: 'Beginner', color: 'bg-green-500' },
                          { value: 'Intermediate', label: 'Intermediate', color: 'bg-blue-500' },
                          { value: 'Advanced', label: 'Advanced', color: 'bg-purple-500' },
                        ]}
                        value={newLevel}
                        onChange={(val) => setNewLevel(val as Course['level'])}
                        placeholder="Select level"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Image URL</label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 transition-all outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                        placeholder="https://..."
                        value={newImage}
                        onChange={(e) => setNewImage(e.target.value)}
                        onBlur={() => {
                          if (!newImage) return;
                          const converted = convertGoogleDriveImageUrl(newImage);
                          if (converted !== newImage) {
                            setNewImage(converted);
                            showToast('Converted Google Drive link', 'success');
                          }
                        }}
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="mb-1 block text-sm font-medium text-gray-700">Contact Info</label>
                      <div className="flex gap-2">
                        <div className="w-36">
                          <Dropdown
                            options={[
                              { value: 'phone', label: '📞 Phone', color: 'bg-blue-500' },
                              { value: 'link', label: '🔗 Link', color: 'bg-purple-500' },
                            ]}
                            value={newContactType}
                            onChange={(val) => setNewContactType(val as 'phone' | 'link')}
                            size="sm"
                          />
                        </div>
                        <input
                          type="text"
                          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 transition-all outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                          placeholder={newContactType === 'phone' ? '0912345678' : 'https://facebook.com/instructor'}
                          value={newContact}
                          onChange={(e) => setNewContact(e.target.value)}
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-400">Optional: Contact info for students to reach instructor</p>
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Schedule Section */}
                <CollapsibleSection title="Schedule Information" icon={<Clock size={18} />} defaultOpen={true}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Duration</label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 transition-all outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                        placeholder="e.g., 8 tuần hoặc 20 giờ"
                        value={newDuration}
                        onChange={(e) => setNewDuration(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Hours/Week</label>
                      <input
                        type="number"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 transition-all outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                        placeholder="0"
                        value={newHoursPerWeek || ''}
                        onChange={(e) => setNewHoursPerWeek(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Start Date</label>
                      <input
                        type="date"
                        title="Course start date"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 transition-all outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                        value={newStartDate}
                        onChange={(e) => setNewStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">End Date</label>
                      <input
                        type="date"
                        title="Course end date"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 transition-all outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                        value={newEndDate}
                        onChange={(e) => setNewEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Benefits Section */}
                <CollapsibleSection
                  title="Benefits (Lợi ích)"
                  icon={<CheckCircle size={18} />}
                  defaultOpen={false}
                  badge={benefits.length > 0 ? `${benefits.length}` : undefined}
                >
                  <div className="space-y-3">
                    {benefits.map((benefit, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-medium text-emerald-600">
                          {index + 1}
                        </div>
                        <input
                          type="text"
                          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                          placeholder="e.g., Kiến thức chuyên sâu"
                          value={benefit}
                          onChange={(e) => updateBenefit(index, e.target.value)}
                        />
                        <button
                          onClick={() => removeBenefit(index)}
                          className="rounded p-2 text-red-500 transition-colors hover:bg-red-50"
                          title="Remove benefit"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addBenefit}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-2 text-gray-500 transition-colors hover:border-emerald-400 hover:text-emerald-600"
                    >
                      <Plus size={16} />
                      Add Benefit
                    </button>
                  </div>
                </CollapsibleSection>

                {/* Sections/Curriculum */}
                <CollapsibleSection
                  title="Curriculum (Giáo trình)"
                  icon={<ListOrdered size={18} />}
                  defaultOpen={false}
                  badge={sections.length > 0 ? `${sections.length}` : undefined}
                >
                  <div className="space-y-3">
                    {sections.map((section, index) => (
                      <div key={index} className="space-y-3 rounded-lg bg-gray-50 p-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-medium text-white">
                            {index + 1}
                          </span>
                          <input
                            type="text"
                            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                            placeholder="Section title, e.g., Kiến thức nền tảng"
                            value={section.title}
                            onChange={(e) => updateSection(index, 'title', e.target.value)}
                          />
                          <button
                            onClick={() => removeSection(index)}
                            className="rounded p-2 text-red-500 transition-colors hover:bg-red-50"
                            title="Remove section"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 pl-10">
                          <div>
                            <label className="mb-1 block text-xs text-gray-500">Lessons</label>
                            <input
                              type="number"
                              min="0"
                              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                              placeholder="5"
                              value={section.lessons || ''}
                              onChange={(e) => updateSection(index, 'lessons', Number(e.target.value))}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-gray-500">Duration</label>
                            <input
                              type="text"
                              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                              placeholder="45 phút"
                              value={section.duration}
                              onChange={(e) => updateSection(index, 'duration', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-gray-500">Description</label>
                            <input
                              type="text"
                              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                              placeholder="Optional"
                              value={section.description || ''}
                              onChange={(e) => updateSection(index, 'description', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={addSection}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-2 text-gray-500 transition-colors hover:border-emerald-400 hover:text-emerald-600"
                    >
                      <Plus size={16} />
                      Add Section
                    </button>
                  </div>
                </CollapsibleSection>

                {/* AI Description */}
                <CollapsibleSection title="Description" icon={<Sparkles size={18} />} defaultOpen={false}>
                  <div className="space-y-4">
                    <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <label className="block text-sm font-semibold text-emerald-800">AI Syllabus Generator</label>
                        <Sparkles size={16} className="text-emerald-600" />
                      </div>
                      <button
                        onClick={handleGenerateAI}
                        disabled={isGenerating || !newTitle}
                        className={`flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                          isGenerating || !newTitle
                            ? 'cursor-not-allowed bg-emerald-200 text-emerald-500'
                            : 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
                        }`}
                      >
                        {isGenerating ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                            Creating Syllabus...
                          </>
                        ) : (
                          <>
                            <BookOpen size={16} />
                            Generate Outline with Gemini
                          </>
                        )}
                      </button>
                    </div>

                    <div>
                      <label htmlFor="generated-syllabus" className="mb-1 block text-sm font-medium text-gray-700">
                        Course Description
                      </label>
                      <textarea
                        id="generated-syllabus"
                        value={generatedSyllabus}
                        onChange={(e) => setGeneratedSyllabus(e.target.value)}
                        placeholder="Course description and syllabus..."
                        className="h-32 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </CollapsibleSection>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
                <button onClick={closeModal} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100">
                  Cancel
                </button>
                <button
                  onClick={handleAddCourse}
                  disabled={!newTitle || !newInstructor || isSaving}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : editingId ? (
                    'Update Course'
                  ) : (
                    'Save Course'
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Document Modal */}
      {isModalOpen &&
        modalType === 'document' &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
            <div className="animate-fade-in-up relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-100 bg-amber-50 px-6 py-4">
                <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                  <FileText size={18} className="text-amber-600" />
                  {editingId ? 'Edit Document' : 'New Document'}
                </h3>
                <button onClick={closeModal} title="Close modal" className="text-gray-400 hover:text-gray-600">
                  ✕
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto p-6">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Document Title *</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 transition-all outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500"
                    placeholder="e.g., React Best Practices Guide"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Author *</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 transition-all outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500"
                      placeholder="e.g., Dr. Smith"
                      value={docAuthor}
                      onChange={(e) => setDocAuthor(e.target.value)}
                    />
                  </div>
                  <div>
                    <Dropdown
                      label="Category"
                      options={[
                        { value: 'Tutorial', label: 'Tutorial', color: 'bg-blue-500' },
                        { value: 'Reference', label: 'Reference', color: 'bg-purple-500' },
                        { value: 'Guide', label: 'Guide', color: 'bg-green-500' },
                        { value: 'Research', label: 'Research', color: 'bg-orange-500' },
                      ]}
                      value={docCategory}
                      onChange={(val) => setDocCategory(val as Document['category'])}
                      placeholder="Select category"
                    />
                  </div>
                </div>

                {/* Link Field - Special Security Field */}
                <div>
                  <label className="mb-1 flex items-center gap-1 text-sm font-medium text-gray-700">
                    <LinkIcon size={14} className="text-amber-600" />
                    Document Link
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      className={`w-full rounded-lg border px-3 py-2 transition-all outline-none focus:ring-2 ${
                        linkError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-amber-500 focus:ring-amber-500'
                      }`}
                      placeholder="https://docs.example.com/document"
                      value={docLink}
                      onChange={(e) => handleLinkChange(e.target.value)}
                    />
                    {docLink && !linkError && (
                      <div className="absolute top-1/2 right-3 -translate-y-1/2 text-green-500">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  {linkError && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                      <AlertTriangle size={12} />
                      {linkError}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">Only HTTP/HTTPS links are allowed. Links are validated for security.</p>
                </div>

                {/* Thumbnail */}
                <div>
                  <label className="mb-1 flex items-center gap-1 text-sm font-medium text-gray-700">
                    <ImageIcon size={14} className="text-amber-600" />
                    Thumbnail URL (Optional)
                  </label>
                  <input
                    type="url"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 transition-all outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500"
                    placeholder="https://example.com/thumbnail.jpg"
                    value={docThumbnail}
                    onChange={(e) => setDocThumbnail(e.target.value)}
                    onBlur={() => {
                      if (!docThumbnail) return;
                      const converted = convertGoogleDriveImageUrl(docThumbnail);
                      if (converted !== docThumbnail) {
                        setDocThumbnail(converted);
                        showToast('Converted Google Drive link', 'success');
                      }
                    }}
                  />
                  {docThumbnail && (
                    <div className="mt-2">
                      <img
                        src={docThumbnail}
                        alt="Thumbnail preview"
                        className="h-20 w-auto rounded-lg object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    className="h-24 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 transition-all outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500"
                    placeholder="Brief description of the document..."
                    value={docDescription}
                    onChange={(e) => setDocDescription(e.target.value)}
                  />
                </div>

                {/* Visibility Toggle */}
                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                  <div className="flex items-center gap-2">
                    {docIsPublic ? <Globe size={18} className="text-green-600" /> : <Lock size={18} className="text-gray-600" />}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{docIsPublic ? 'Public Document' : 'Private Document'}</p>
                      <p className="text-xs text-gray-500">{docIsPublic ? 'Visible to all users' : 'Only visible to admins'}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    title={docIsPublic ? 'Make private' : 'Make public'}
                    aria-label={docIsPublic ? 'Make private' : 'Make public'}
                    onClick={() => setDocIsPublic(!docIsPublic)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${docIsPublic ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${docIsPublic ? 'translate-x-6' : 'translate-x-1'}`}
                    />
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
                <button onClick={closeModal} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100">
                  Cancel
                </button>
                <button
                  onClick={handleAddDocument}
                  disabled={!docTitle || !docAuthor || !docLink || !!linkError || isSaving}
                  className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : editingId ? (
                    'Update Document'
                  ) : (
                    'Save Document'
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* View Course Details Modal */}
      {isModalOpen &&
        modalType === 'view-course' &&
        viewingCourse &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
            <div className="animate-fade-in-up relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
              {/* Header with Image */}
              <div className="relative h-48 bg-gradient-to-r from-emerald-600 to-teal-600">
                {viewingCourse.image && (
                  <img src={viewingCourse.image} alt={viewingCourse.title} className="absolute inset-0 h-full w-full object-cover opacity-30" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <button
                  onClick={closeModal}
                  title="Close modal"
                  className="absolute top-4 right-4 rounded-lg bg-white/20 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                >
                  <X size={20} />
                </button>
                <div className="absolute right-6 bottom-4 left-6">
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getLevelColor(viewingCourse.level)}`}>
                      {viewingCourse.level}
                    </span>
                    {viewingCourse.price === 0 ? (
                      <span className="rounded-full bg-green-500 px-2.5 py-0.5 text-xs font-medium text-white">Free</span>
                    ) : (
                      <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-medium text-white">₫{viewingCourse.price.toLocaleString()}</span>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-white">{viewingCourse.title}</h2>
                  <p className="mt-1 text-white/80">by {viewingCourse.instructor}</p>
                </div>
                {isLoadingCourseDetails && (
                  <div className="absolute top-4 left-4">
                    <Loader2 size={20} className="animate-spin text-white" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 space-y-6 overflow-y-auto p-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="rounded-lg bg-gray-50 p-4 text-center">
                    <Star size={24} className="mx-auto mb-2 fill-yellow-500 text-yellow-500" />
                    <p className="text-2xl font-bold text-gray-900">{viewingCourse.rating || 0}</p>
                    <p className="text-xs text-gray-500">{viewingCourse.reviewsCount || 0} reviews</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4 text-center">
                    <Clock size={24} className="mx-auto mb-2 text-emerald-600" />
                    <p className="text-lg font-bold text-gray-900">{viewingCourse.duration || 'N/A'}</p>
                    <p className="text-xs text-gray-500">Duration</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4 text-center">
                    <Calendar size={24} className="mx-auto mb-2 text-blue-600" />
                    <p className="text-lg font-bold text-gray-900">{viewingCourse.hoursPerWeek || 0}h</p>
                    <p className="text-xs text-gray-500">Hours/Week</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4 text-center">
                    <BookOpen size={24} className="mx-auto mb-2 text-purple-600" />
                    <p className="text-lg font-bold text-gray-900">{viewingCourse.sections?.length || 0}</p>
                    <p className="text-xs text-gray-500">Sections</p>
                  </div>
                </div>

                {/* Contact Info */}
                {(viewingCourse.contactInfo || viewingCourse.contact) && (
                  <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-4">
                    {(viewingCourse.contactInfo || viewingCourse.contact || '').startsWith('http') ? (
                      <>
                        <LinkIcon size={20} className="text-emerald-600" />
                        <div>
                          <p className="text-sm font-medium text-emerald-900">Contact Link</p>
                          <a
                            href={viewingCourse.contactInfo || viewingCourse.contact}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-emerald-700 hover:underline"
                          >
                            {viewingCourse.contactInfo || viewingCourse.contact}
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </>
                    ) : (
                      <>
                        <Phone size={20} className="text-emerald-600" />
                        <div>
                          <p className="text-sm font-medium text-emerald-900">Phone</p>
                          <a href={`tel:${viewingCourse.contactInfo || viewingCourse.contact}`} className="text-sm text-emerald-700 hover:underline">
                            {viewingCourse.contactInfo || viewingCourse.contact}
                          </a>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Schedule */}
                {(viewingCourse.startDate || viewingCourse.endDate) && (
                  <div className="rounded-lg bg-blue-50 p-4">
                    <h4 className="mb-2 flex items-center gap-2 font-semibold text-blue-900">
                      <Calendar size={18} />
                      Schedule
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {viewingCourse.startDate && (
                        <div>
                          <span className="text-blue-700">Start Date:</span>
                          <span className="ml-2 font-medium text-blue-900">{formatDate(viewingCourse.startDate)}</span>
                        </div>
                      )}
                      {viewingCourse.endDate && (
                        <div>
                          <span className="text-blue-700">End Date:</span>
                          <span className="ml-2 font-medium text-blue-900">{formatDate(viewingCourse.endDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Description */}
                {viewingCourse.description && (
                  <div>
                    <h4 className="mb-2 flex items-center gap-2 font-semibold text-gray-900">
                      <FileText size={18} className="text-gray-600" />
                      Description
                    </h4>
                    <div className="rounded-lg bg-gray-50 p-4 text-sm whitespace-pre-wrap text-gray-700">{viewingCourse.description}</div>
                  </div>
                )}

                {/* Benefits */}
                {viewingCourse.benefits && viewingCourse.benefits.length > 0 && (
                  <div>
                    <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                      <CheckCircle size={18} className="text-emerald-600" />
                      What You'll Learn ({viewingCourse.benefits.length})
                    </h4>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      {viewingCourse.benefits.map((benefit, index) => (
                        <div key={index} className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3">
                          <CheckCircle size={16} className="mt-0.5 flex-shrink-0 text-emerald-500" />
                          <span className="text-sm text-gray-700">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sections/Curriculum */}
                {viewingCourse.sections && viewingCourse.sections.length > 0 && (
                  <div>
                    <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                      <ListOrdered size={18} className="text-purple-600" />
                      Curriculum ({viewingCourse.sections.length} sections)
                    </h4>
                    <div className="space-y-2">
                      {viewingCourse.sections.map((section, index) => (
                        <div key={index} className="rounded-lg bg-gray-50 p-4 transition-colors hover:bg-gray-100">
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-600 text-sm font-medium text-white">
                              {index + 1}
                            </span>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{section.title}</p>
                              <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                                {section.lessons > 0 && (
                                  <span className="flex items-center gap-1">
                                    <BookOpen size={12} />
                                    {section.lessons} lessons
                                  </span>
                                )}
                                {section.duration && (
                                  <span className="flex items-center gap-1">
                                    <Clock size={12} />
                                    {section.duration}
                                  </span>
                                )}
                              </div>
                              {section.description && <p className="mt-1 text-xs text-gray-500">{section.description}</p>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comments/Reviews */}
                {viewingCourse.comments && viewingCourse.comments.length > 0 && (
                  <div>
                    <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                      <MessageSquare size={18} className="text-blue-600" />
                      Reviews & Comments ({viewingCourse.comments.length})
                    </h4>
                    <div className="max-h-64 space-y-3 overflow-y-auto">
                      {viewingCourse.comments.map((comment) => (
                        <div key={comment.id} className="rounded-lg bg-gray-50 p-4">
                          <div className="flex items-start gap-3">
                            {comment.userAvatar ? (
                              <img src={comment.userAvatar} alt={comment.userName} className="h-10 w-10 rounded-full object-cover" />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                                <span className="text-sm font-medium text-blue-600">{comment.userName.charAt(0).toUpperCase()}</span>
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-gray-900">{comment.userName}</p>
                                <span className="text-xs text-gray-400">{formatDate(comment.createdAt)}</span>
                              </div>
                              {comment.rating && (
                                <div className="mt-1 flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star key={star} size={12} className={star <= comment.rating! ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
                                  ))}
                                </div>
                              )}
                              <p className="mt-2 text-sm text-gray-600">{comment.content}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Comments State */}
                {(!viewingCourse.comments || viewingCourse.comments.length === 0) && (
                  <div className="rounded-lg bg-gray-50 p-6 text-center">
                    <MessageSquare size={32} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-500">No reviews yet</p>
                  </div>
                )}

                {/* Metadata */}
                <div className="flex flex-wrap gap-4 border-t border-gray-100 pt-4 text-xs text-gray-400">
                  {viewingCourse.createdAt && <span>Created: {formatDate(viewingCourse.createdAt)}</span>}
                  {viewingCourse.updatedAt && <span>Updated: {formatDate(viewingCourse.updatedAt)}</span>}
                  <span>ID: {viewingCourse.id}</span>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-4">
                <button onClick={closeModal} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100">
                  Close
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      closeModal();
                      if (viewingCourse) openCourseModal(viewingCourse);
                    }}
                    className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700"
                  >
                    <Edit2 size={16} />
                    Edit Course
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* View Document Details Modal */}
      {isModalOpen &&
        modalType === 'view-document' &&
        viewingDocument &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
            <div className="animate-fade-in-up relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
              {/* Header with gradient */}
              <div className="relative h-32 bg-gradient-to-r from-amber-500 to-orange-500">
                {viewingDocument.thumbnail && (
                  <img src={viewingDocument.thumbnail} alt={viewingDocument.title} className="absolute inset-0 h-full w-full object-cover opacity-30" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <button
                  onClick={closeModal}
                  title="Close modal"
                  className="absolute top-4 right-4 rounded-lg bg-white/20 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                >
                  <X size={20} />
                </button>
                <div className="absolute right-6 bottom-4 left-6">
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${getCategoryColor(viewingDocument.category)}`}>
                      {viewingDocument.category}
                    </span>
                    <span
                      className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${viewingDocument.isPublic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                    >
                      {viewingDocument.isPublic ? <Globe size={12} /> : <Lock size={12} />}
                      {viewingDocument.isPublic ? 'Public' : 'Private'}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white">{viewingDocument.title}</h2>
                  <p className="mt-1 text-sm text-white/80">by {viewingDocument.author}</p>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 space-y-6 overflow-y-auto p-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="rounded-lg bg-gray-50 p-4 text-center">
                    <Star size={24} className="mx-auto mb-2 fill-yellow-500 text-yellow-500" />
                    <p className="text-2xl font-bold text-gray-900">{viewingDocument.rating ?? 0}</p>
                    <p className="text-xs text-gray-500">{viewingDocument.reviewsCount ?? 0} reviews</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4 text-center">
                    <Download size={24} className="mx-auto mb-2 text-amber-600" />
                    <p className="text-2xl font-bold text-gray-900">{viewingDocument.downloads.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Downloads</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4 text-center">
                    <FileText size={24} className="mx-auto mb-2 text-blue-600" />
                    <p className="text-lg font-bold text-gray-900">{viewingDocument.category}</p>
                    <p className="text-xs text-gray-500">Category</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4 text-center">
                    {viewingDocument.isPublic ? (
                      <Globe size={24} className="mx-auto mb-2 text-green-600" />
                    ) : (
                      <Lock size={24} className="mx-auto mb-2 text-gray-600" />
                    )}
                    <p className="text-lg font-bold text-gray-900">{viewingDocument.isPublic ? 'Public' : 'Private'}</p>
                    <p className="text-xs text-gray-500">Visibility</p>
                  </div>
                </div>

                {/* Document Link */}
                <div className="rounded-lg bg-amber-50 p-4">
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <LinkIcon size={16} className="text-amber-600" />
                    Document Link
                  </h4>
                  <a
                    href={viewingDocument.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 break-all text-blue-600 underline hover:text-blue-800"
                  >
                    {viewingDocument.link}
                    <ExternalLink size={14} className="flex-shrink-0" />
                  </a>
                </div>

                {/* Description */}
                {viewingDocument.description && (
                  <div>
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <FileText size={16} className="text-gray-500" />
                      Description
                    </h4>
                    <p className="rounded-lg bg-gray-50 p-4 whitespace-pre-wrap text-gray-600">{viewingDocument.description}</p>
                  </div>
                )}

                {/* Thumbnail Preview */}
                {viewingDocument.thumbnail && (
                  <div>
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <ImageIcon size={16} className="text-gray-500" />
                      Thumbnail
                    </h4>
                    <img
                      src={viewingDocument.thumbnail}
                      alt={viewingDocument.title}
                      className="max-h-48 w-full rounded-lg border border-gray-200 object-cover"
                    />
                  </div>
                )}

                {/* Comments/Reviews */}
                {viewingDocument.comments && viewingDocument.comments.length > 0 && (
                  <div>
                    <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                      <MessageSquare size={18} className="text-amber-600" />
                      Reviews & Comments ({viewingDocument.comments.length})
                    </h4>
                    <div className="max-h-64 space-y-3 overflow-y-auto">
                      {viewingDocument.comments.map((comment) => (
                        <div key={comment.id} className="rounded-lg bg-gray-50 p-4">
                          <div className="flex items-start gap-3">
                            {comment.userAvatar ? (
                              <img src={comment.userAvatar} alt={comment.userName} className="h-10 w-10 rounded-full object-cover" />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                                <span className="text-sm font-medium text-amber-600">{comment.userName.charAt(0).toUpperCase()}</span>
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-gray-900">{comment.userName}</p>
                                <span className="text-xs text-gray-400">{formatDate(comment.createdAt)}</span>
                              </div>
                              {comment.rating && (
                                <div className="mt-1 flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star key={star} size={12} className={star <= comment.rating! ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
                                  ))}
                                </div>
                              )}
                              <p className="mt-2 text-sm text-gray-600">{comment.content}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Comments State */}
                {(!viewingDocument.comments || viewingDocument.comments.length === 0) && (
                  <div className="rounded-lg bg-gray-50 p-6 text-center">
                    <MessageSquare size={32} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-500">No reviews yet</p>
                  </div>
                )}

                {/* Metadata */}
                <div className="flex flex-wrap gap-4 border-t border-gray-100 pt-4 text-xs text-gray-400">
                  {viewingDocument.createdAt && <span>Created: {formatDate(viewingDocument.createdAt)}</span>}
                  {viewingDocument.updatedAt && <span>Updated: {formatDate(viewingDocument.updatedAt)}</span>}
                  <span>ID: {viewingDocument.id}</span>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-4">
                <button onClick={closeModal} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100">
                  Close
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDocumentAction('open-link', viewingDocument)}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
                  >
                    <ExternalLink size={16} />
                    Open Link
                  </button>
                  <button
                    onClick={() => {
                      closeModal();
                      openDocumentModal(viewingDocument);
                    }}
                    className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-amber-600"
                  >
                    <Edit2 size={16} />
                    Edit Document
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default DocumentManager;

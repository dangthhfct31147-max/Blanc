import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit2, Trash2, BookOpen, Star, MoreHorizontal, Sparkles, DollarSign, Eye } from 'lucide-react';
import { Course } from '../types';
import { MOCK_COURSES } from '../constants';
import { generateCourseSyllabus } from '../services/geminiService';
import { Dropdown } from './ui/Dropdown';

const CourseManager: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>(MOCK_COURSES);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newInstructor, setNewInstructor] = useState('');
  const [newPrice, setNewPrice] = useState<number>(0);
  const [newLevel, setNewLevel] = useState<Course['level']>('Beginner');
  const [generatedSyllabus, setGeneratedSyllabus] = useState('');

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

  const handleAddCourse = () => {
    const newCourse: Course = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTitle,
      instructor: newInstructor,
      price: newPrice,
      rating: 0,
      reviewsCount: 0,
      level: newLevel,
      image: `https://picsum.photos/seed/${newTitle.replace(/\s/g, '')}/400/300`,
      description: generatedSyllabus,
    };
    setCourses([...courses, newCourse]);
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setNewTitle('');
    setNewInstructor('');
    setNewPrice(0);
    setNewLevel('Beginner');
    setGeneratedSyllabus('');
  };

  const handleAction = (action: string, course: Course) => {
    if (action === 'edit') {
      setNewTitle(course.title);
      setNewInstructor(course.instructor);
      setNewPrice(course.price);
      setNewLevel(course.level);
      setGeneratedSyllabus(course.description || '');
      setIsModalOpen(true);
    } else if (action === 'delete') {
      setCourses(courses.filter((c) => c.id !== course.id));
    } else {
      console.log(`${action} course: ${course.title}`);
    }
    setOpenActionId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Courses</h2>
          <p className="mt-1 text-gray-500">Manage learning materials and instructors</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-white shadow-sm transition-all hover:bg-emerald-700"
        >
          <Plus size={18} />
          Add Course
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-900 uppercase">
              <tr>
                <th className="px-6 py-4">Course</th>
                <th className="px-6 py-4">Instructor</th>
                <th className="px-6 py-4">Level</th>
                <th className="px-6 py-4">Rating</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {courses.map((course) => (
                <tr key={course.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <img src={course.image} alt="" className="h-10 w-16 rounded-md object-cover" />
                      <div>
                        <p className="font-semibold text-gray-900">{course.title}</p>
                        <p className="text-xs text-gray-400">ID: {course.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-900">{course.instructor}</span>
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
                        <div className="animate-fade-in-up absolute right-0 z-50 mt-2 w-48 origin-top-right overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl">
                          <div className="py-1">
                            <button
                              onClick={() => handleAction('view', course)}
                              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                            >
                              <Eye size={16} className="text-gray-400" />
                              <span>View Details</span>
                            </button>
                            <button
                              onClick={() => handleAction('edit', course)}
                              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                            >
                              <Edit2 size={16} className="text-gray-400" />
                              <span>Edit Course</span>
                            </button>
                            <div className="my-1 border-t border-gray-50"></div>
                            <button
                              onClick={() => handleAction('delete', course)}
                              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
                            >
                              <Trash2 size={16} />
                              <span>Delete Course</span>
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
      </div>

      {/* Create Modal */}
      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <div className="animate-fade-in-up relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                <h3 className="font-semibold text-gray-900">{newTitle && courses.find((c) => c.title === newTitle) ? 'Edit Course' : 'New Course'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  ✕
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto p-6">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Course Title</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 transition-all outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g., Advanced React Patterns"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Instructor</label>
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

                {/* AI Section */}
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-sm font-semibold text-emerald-800">AI Syllabus Generator</label>
                    <Sparkles size={16} className="text-emerald-600" />
                  </div>
                  <button
                    onClick={handleGenerateAI}
                    disabled={isGenerating || !newTitle}
                    className={`mb-3 flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
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
                  {generatedSyllabus && (
                    <div className="mt-2">
                      <label htmlFor="generated-syllabus" className="mb-1 block text-xs font-medium text-emerald-700">
                        Generated Syllabus:
                      </label>
                      <textarea
                        id="generated-syllabus"
                        value={generatedSyllabus}
                        onChange={(e) => setGeneratedSyllabus(e.target.value)}
                        placeholder="AI-generated syllabus will appear here..."
                        className="h-32 w-full rounded border border-emerald-200 bg-white p-2 text-xs text-gray-700 outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCourse}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700"
                >
                  Save Course
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default CourseManager;

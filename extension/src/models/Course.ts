import CourseCrawler from "./CourseCrawler"

/**
 * Backwards-compatible course model.
 *
 * Existing consumers can keep importing Course while the implementation lives
 * in the crawler hierarchy.
 */
class Course extends CourseCrawler {}

export default Course
